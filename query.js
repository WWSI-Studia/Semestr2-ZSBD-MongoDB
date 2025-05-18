// 1 - Na jakiej zmianie urządzenie uległo awarii / zostało naprawione ($addFields, $cond, $hour) 
db.incident.aggregate([
    {
      $lookup: {
        from: "shift",
        let: { reportTime: "$report_time" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $lte: ["$start_time", "$$reportTime"] },
                  { $gte: ["$end_time", "$$reportTime"] }
                ]
              }
            }
          },
          {
            $project: {
              shift_name: 1
            }
          }
        ],
        as: "shift_info"
      }
    },
    {
      $addFields: {
        shift_id: { $arrayElemAt: ["$shift_info._id", 0] },
        shift_name: { $arrayElemAt: ["$shift_info.shift_name", 0] },
        report_hour: { $hour: "$report_time" }
      }
    },
    {
      $project: {
        _id: 1,
        device_id: 1,
        report_time: 1,
        report_hour: 1,
        shift_id: 1,
        shift_name: 1,
      }
    }
  ]);


// 2 - Czas postoju urządzenia ($subtract, $sum, $match) 
db.incident.aggregate([
    {
      $match: {
        device_id: "1"
      }
    },
    {
      $sort: { report_time: 1 }
    },
    {
      $group: {
        _id: "$device_id",
        incidents: {
          $push: {
            report_time: "$report_time",
            repair_time: "$repair_time"
          }
        }
      }
    },
    {
      $addFields: {
        total_downtime_ms: {
          $function: {
            body: function(incidents) {
              if (incidents.length === 0) return 0;
            
              // Sort safely
              incidents.sort((a, b) => a.report_time - b.report_time);
            
              let merged = [];
              let current = {
                start: new Date(incidents[0].report_time),
                end: new Date(incidents[0].repair_time)
              };
            
              for (let i = 1; i < incidents.length; i++) {
                const nextStart = report_time;
                const nextEnd = repair_time;
            
                if (nextStart <= current.end) {
                  current.end = new Date(Math.max(current.end.getTime(), nextEnd.getTime()));
                } else {
                  merged.push(current);
                  current = { start: nextStart, end: nextEnd };
                }
              }
              merged.push(current);
            
              let total = 0;
              for (let interval of merged) {
                total += interval.end - interval.start;
              }
              return total;
            },
            args: ["$incidents"],
            lang: "js"
          }
        }
      }
    },
    {
      $project: {
        _id: 1,
        total_downtime_minutes: { $divide: ["$total_downtime_ms", 1000 * 60] }
      }
    }
  ]);

// 3 - Czas postoju urządzenia + Pomiń weekendy — filtruj z użyciem $dayOfWeek i $match 
db.incident.aggregate([
  { $match: { device_id: "1" } },
  { $sort: { report_time: 1 } },

  // Step 1: group and prepare for merging
  {
    $group: {
      _id: "$device_id",
      incidents: {
        $push: {
          report_time: "$report_time",
          repair_time: "$repair_time"
        }
      }
    }
  },

  // Step 2: use $function to merge overlapping intervals
  {
    $addFields: {
      merged: {
        $function: {
          body: function(incidents) {
            if (!incidents.length) return [];

            // Convert to Date
            incidents = incidents.map(i => ({
              start: new Date(i.report_time),
              end: new Date(i.repair_time)
            }));

            // Sort
            incidents.sort((a, b) => a.start - b.start);

            const merged = [];
            let current = { ...incidents[0] };

            for (let i = 1; i < incidents.length; i++) {
              const next = incidents[i];
              if (next.start <= current.end) {
                current.end = new Date(Math.max(current.end.getTime(), next.end.getTime()));
              } else {
                merged.push(current);
                current = { ...next };
              }
            }
            merged.push(current);

            return merged.map(m => ({
              report_time: m.start,
              repair_time: m.end
            }));
          },
          args: ["$incidents"],
          lang: "js"
        }
      }
    }
  },

  // Step 3: flatten merged intervals
  { $unwind: "$merged" },

  // Step 4: convert to Date (ensures consistency)
  {
    $addFields: {
      report_time: { $toDate: "$merged.report_time" },
      repair_time: { $toDate: "$merged.repair_time" }
    }
  },

  // Step 5: calculate raw duration and weekend approximations
  {
    $project: {
      device_id: "$_id",
      report_time: 1,
      repair_time: 1,
      total_ms: { $subtract: ["$repair_time", "$report_time"] },

      week_diff: {
        $floor: {
          $divide: [
            { $subtract: ["$repair_time", "$report_time"] },
            1000 * 60 * 60 * 24 * 7
          ]
        }
      },

      start_day: { $dayOfWeek: "$report_time" },
      start_hour: { $hour: "$report_time" },
      end_day: { $dayOfWeek: "$repair_time" },
      end_hour: { $hour: "$repair_time" }
    }
  },

  {
    $addFields: {
      approx_weekend_ms: {
        $multiply: ["$week_diff", 1000 * 60 * 60 * 48]
      },

      extra_weekend_start_ms: {
        $cond: [
          {
            $or: [
              { $and: [{ $eq: ["$start_day", 7] }, { $gte: ["$start_hour", 6] }] },
              { $eq: ["$start_day", 1] },
              { $and: [{ $eq: ["$start_day", 2] }, { $lt: ["$start_hour", 6] }] }
            ]
          },
          1000 * 60 * 60 * 1,
          0
        ]
      },

      extra_weekend_end_ms: {
        $cond: [
          {
            $or: [
              { $and: [{ $eq: ["$end_day", 7] }, { $gte: ["$end_hour", 6] }] },
              { $eq: ["$end_day", 1] },
              { $and: [{ $eq: ["$end_day", 2] }, { $lt: ["$end_hour", 6] }] }
            ]
          },
          1000 * 60 * 60 * 1,
          0
        ]
      }
    }
  },

  {
    $addFields: {
      total_weekend_ms: {
        $add: ["$approx_weekend_ms", "$extra_weekend_start_ms", "$extra_weekend_end_ms"]
      },
      net_downtime_ms: {
        $subtract: [
          "$total_ms",
          {
            $add: [
              "$approx_weekend_ms",
              "$extra_weekend_start_ms",
              "$extra_weekend_end_ms"
            ]
          }
        ]
      }
    }
  },

  // Step 6: group per device again
  {
    $group: {
      _id: "$device_id",
      total_downtime_ms: { $sum: "$net_downtime_ms" }
    }
  },

  // Final step: convert to minutes
  {
    $project: {
      _id: 0,
      device_id: "$_id",
      total_downtime_minutes: { $divide: ["$total_downtime_ms", 1000 * 60] }
    }
  }
]);

// 4 - Ile % urządzeń jest w fazie awarii ($group, $count, $project) 

// Krok 1: Zliczamy urządzenia, które mają co najmniej jedną awarię, gdzie brak repair_time
var devicesWithActiveIncidents = db.incident.aggregate([
    {
      $match: {
        repair_time: { $exists: false } // Filtrowanie awarii bez repair_time
      }
    },
    {
      $group: {
        _id: "$device_id", // Grupowanie po urządzeniu
        count: { $sum: 1 } // Liczenie liczby awarii dla danego urządzenia
      }
    },
    {
      $count: "devices_with_active_incidents" // Zliczamy liczbę urządzeń w awarii
    }
  ]).toArray(); // Konwertujemy wynik na tablicę, by łatwiej manipulować
  
  // Krok 2: Zliczamy liczbę wszystkich urządzeń
  var totalDevices = db.device.countDocuments();
  
  // Krok 3: Obliczamy procent urządzeń bez repair_time
  var devicesWithActiveIncidentsCount = devicesWithActiveIncidents[0] ? devicesWithActiveIncidents[0].devices_with_active_incidents : 0;
  var percentage = (devicesWithActiveIncidentsCount / totalDevices) * 100;
  
  print("Procent urządzeń bez repair_time: " + percentage.toFixed(2) + "%");

// 5 - Który oddział miał najwięcej awarii w 2024 ($group, $match, $sort) 

db.incident.aggregate([
    {
      $match: {
        // Filtrujemy awarie z 2024 roku
        report_time: {
          $gte: new ISODate("2024-01-01T00:00:00.000Z"),
          $lt: new ISODate("2025-01-01T00:00:00.000Z")
        }
      }
    },
    {
      $lookup: {
        from: "device", // Kolekcja, z którą łączymy
        localField: "device_id", // Pole w kolekcji `incident`, które łączy się z `device_id`
        foreignField: "_id", // Pole w kolekcji `device`, które odpowiada za łączenie
        as: "device_info" // Nowe pole, które zawiera dane z kolekcji `device`
      }
    },
    {
      $unwind: "$device_info" // Rozwijamy pole `device_info` (w celu łatwego dostępu do `department_id`)
    },
    {
      $group: {
        _id: "$device_info.department_id", // Grupujemy po `department_id` z dokumentu `device`
        total_incidents: { $sum: 1 } // Liczymy liczbę awarii w danym oddziale
      }
    },
    {
      $sort: {
        total_incidents: -1 // Sortujemy malejąco, aby znaleźć oddział z największą liczbą awarii
      }
    },
    {
      $limit: 1 // Zwracamy tylko jeden oddział z największą liczbą awarii
    }
  ])

// 6 - własne
// 7 - własne
// 8 - własne

