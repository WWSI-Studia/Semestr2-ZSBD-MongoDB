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
        shift_name: { $arrayElemAt: ["$shift_info.shift_name", 0] },
        report_hour: { $hour: "$report_time" }
      }
    },
    {
      $project: {
        _id: 1,
        device_id: 1,
        report_time: 1,
        shift_name: 1,
        report_hour: 1,
      }
    }
  ]);


// 2 - Czas postoju urządzenia ($subtract, $sum, $match) 

db.incident.aggregate([
    {
      $match: {
        device_id: ObjectId("DEVICE_ID_HERE")
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
              
              // Sort for safety
              incidents.sort((a, b) => a.report_time - b.report_time);
              
              let merged = [];
              let current = {
                start: incidents[0].report_time,
                end: incidents[0].repair_time
              };
              
              for (let i = 1; i < incidents.length; i++) {
                const next = incidents[i];
                if (next.report_time <= current.end) {
                  // Overlapping - extend end
                  current.end = new Date(Math.max(current.end, next.repair_time));
                } else {
                  // No overlap - push and start new
                  merged.push(current);
                  current = {
                    start: next.report_time,
                    end: next.repair_time
                  };
                }
              }
              merged.push(current); // last one
  
              // Sum total downtime
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
    {
      $match: {
        device_id: ObjectId("DEVICE_ID_HERE")
      }
    },
    {
      $sort: { report_time: 1 }
    },
    {
      $setWindowFields: {
        partitionBy: "$device_id",
        sortBy: { report_time: 1 },
        output: {
          previous_repair_time: {
            $shift: {
              output: "$repair_time",
              by: -1
            }
          }
        }
      }
    },
    {
      $addFields: {
        effective_start_time: {
          $cond: {
            if: {
              $and: [
                { $ne: ["$previous_repair_time", null] },
                { $gt: ["$report_time", "$previous_repair_time"] }
              ]
            },
            then: "$report_time",
            else: {
              $cond: {
                if: { $ne: ["$previous_repair_time", null] },
                then: "$previous_repair_time",
                else: "$report_time"
              }
            }
          }
        }
      }
    },
    {
      $addFields: {
        downtime_ms: {
          $cond: {
            if: {
              $or: [
                {
                  $and: [
                    { $eq: [{ $dayOfWeek: "$effective_start_time" }, 7] }, // Sobota
                    { $gte: [{ $hour: "$effective_start_time" }, 6] }
                  ]
                },
                {
                  $eq: [{ $dayOfWeek: "$effective_start_time" }, 1] // Niedziela
                },
                {
                  $and: [
                    { $eq: [{ $dayOfWeek: "$effective_start_time" }, 2] }, // Poniedziałek
                    { $lt: [{ $hour: "$effective_start_time" }, 6] }
                  ]
                }
              ]
            },
            then: 0,
            else: { $subtract: ["$repair_time", "$effective_start_time"] }
          }
        }
      }
    },
    {
      $group: {
        _id: "$device_id",
        total_downtime_ms: { $sum: "$downtime_ms" }
      }
    },
    {
      $project: {
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
  var totalDevices = db.incident.distinct("device_id").length;
  
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
