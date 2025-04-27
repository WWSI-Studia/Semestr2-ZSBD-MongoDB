import fs from "fs";

export async function mapToProductDetails(pool, file) {
    // simple SQL query (no JSON needed)
    let result = await pool.request().query(`
        SELECT 
            [model]
            ,[product_name]
            ,[category]
            ,[price]
            ,[description]
        FROM [Product_Details]
    `);


    // transform each row into MongoDB format
    const documents = result.recordset.map(row => ({
        _id: row.model.toString(), // or ObjectId later
        product_name: row.product_name,
        category: row.category,
        price: parseFloat(row.price),
        description: row.description,
    }));

    // save to file
    fs.writeFileSync(file, JSON.stringify(documents, null, 2));
    console.log(`✅ Migration completed. File saved as ${file}`);
}

export async function mapToProducts(pool, file) {
    // simple SQL query (no JSON needed)
    let result = await pool.request().query(`
        SELECT 
            wp.product_ID,
            wp.model,
            wp.quantity,
            wp.warehouse_ID,
            wp.warehouse_location.STX AS x,
            wp.warehouse_location.STY AS y,
            pd.product_name,
            pd.category,
            pd.price,
            pd.description,
            a.coordinates.Long AS longitude,
            a.coordinates.Lat AS latitude
        FROM Warehouse_Product wp
        JOIN Product_Details pd ON wp.model = pd.model
        JOIN Warehouse w ON w.warehouse_id = wp.warehouse_id
        JOIN Address a ON w.address_ID = a.address_ID
    `);


    // transform each row into MongoDB format
    const documents = result.recordset.map(row => ({
        _id: row.product_ID.toString(), // or ObjectId later
        model: row.model.toString(),
        product_name: row.product_name,
        category: row.category,
        price: parseFloat(row.price),
        description: row.description,
        quantity: row.quantity,
        warehouse_location: {
            type: "Point", // assuming POINT type
            coordinates: [row.x, row.y]
        },
        warehouse: {
            warehouse_id: row.warehouse_ID,
            coordinates: {
                type: "Point",
                coordinates: [row.longitude, row.latitude]
            }
        }
    }));

    // save to file
    fs.writeFileSync(file, JSON.stringify(documents, null, 2));
    console.log(`✅ Migration completed. File saved as ${file}`);
}

export async function mapToWarehouse(pool, file) {
    // simple SQL query (no JSON needed)
    let result = await pool.request().query(`
        SELECT 
            w.warehouse_ID,
            a.country,
            a.city,
            a.street,
            a.postal_code,
            a.coordinates.Long AS longitude,
            a.coordinates.Lat AS latitude
        FROM Warehouse w
        JOIN Address a ON w.address_ID = a.address_ID
    `);


    // transform each row into MongoDB format
    const documents = result.recordset.map(row => ({
        _id: row.warehouse_ID.toString(),
        address: {
            country: row.country,
            city: row.city,
            street: row.street,
            postal_code: row.postal_code,
            coordinates: {
                type: "Point",
                coordinates: [row.longitude, row.latitude]
            }
        }
    }));

    // save to file
    fs.writeFileSync(file, JSON.stringify(documents, null, 2));
    console.log(`✅ Migration completed. File saved as ${file}`);
}

export async function mapToEmployee(pool, file) {
    // simple SQL query (no JSON needed)
    let result = await pool.request().query(`
        SELECT 
            e.employee_ID,
            e.name,
            e.surname,
            e.role,
            e.hierarchy,
            STUFF((
                SELECT ', ' + CAST(ed.department_ID AS VARCHAR)
                FROM Employee_Department ed
                WHERE ed.employee_ID = e.employee_ID
                FOR XML PATH('')
            ), 1, 2, '') AS department_ids,
            STUFF((
                SELECT ', ' + CAST(ew.warehouse_ID AS VARCHAR)
                FROM Employee_Warehouse ew
                WHERE ew.employee_ID = e.employee_ID
                FOR XML PATH('')
            ), 1, 2, '') AS warehouse_ids
        FROM Employee e
    `);


    // transform each row into MongoDB format
    const documents = result.recordset.map(row => ({
        _id: row.employee_ID.toString(),
        name: row.name,
        surname: row.surname,
        role: row.role,
        hierarchy: row.hierarchy,
        departments: row.department_ids ? row.department_ids.split(', ') : [],
        warehouses: row.warehouse_ids ? row.warehouse_ids.split(', ') : []
    }));

    // save to file
    fs.writeFileSync(file, JSON.stringify(documents, null, 2));
    console.log(`✅ Migration completed. File saved as ${file}`);
}

export async function mapToShifts(pool, file) {
    // simple SQL query (no JSON needed)
    let result = await pool.request().query(`
        SELECT 
            s.shift_id,
            s.shift_name,
            s.start_time,
            s.end_time,
            se.employee_id,
            se.clock_in,
            se.clock_out
        FROM shift s
        JOIN shift_employee se ON s.shift_id = se.shift_id
        JOIN employee e ON se.employee_id = e.employee_id
    `);


    // Create a map to accumulate shift data
    const shiftMap = {};

    // Process each row from the SQL result
    result.recordset.forEach(row => {
        const shiftId = row.shift_id.toString(); // Shift ID as string

        // If the shift is not yet in the map, initialize an empty object for it
        if (!shiftMap[shiftId]) {
            shiftMap[shiftId] = {
                _id: shiftId,  // Use the shift_id as _id in MongoDB
                shift_name: row.shift_name,
                start_time: row.start_time,
                end_time: row.end_time,
                employees: []  // Initialize empty array for employees
            };
        }

        // Push the employee data into the shift's employees array
        shiftMap[shiftId].employees.push({
            employee_id: row.employee_id.toString(),
            clock_in: row.clock_in,
            clock_out: row.clock_out
        });
    });

    // Convert the shiftMap object into an array of shift documents
    const documents = Object.values(shiftMap);

    // save to file
    fs.writeFileSync(file, JSON.stringify(documents, null, 2));
    console.log(`✅ Migration completed. File saved as ${file}`);
}


export async function mapToIncidentStatuses(pool, file) {
    // simple SQL query (no JSON needed)
    let result = await pool.request().query(`
        SELECT 
            i.incident_id,
            i.shift_id,
            i.employee_id,
            i.time,
            i.description
        FROM Incident_Status i
        ORDER BY i.incident_id, i.time
    `);


    // Create a map to accumulate incident statuses
    const incidentMap = {};

    // Process each row from the SQL result
    result.recordset.forEach(row => {
        const incidentId = row.incident_id.toString(); // Incident ID as string

        // If the incident is not yet in the map, initialize an empty object for it
        if (!incidentMap[incidentId]) {
            incidentMap[incidentId] = {
                incident_id: incidentId,
                created_at: row.time,  // Set the created_at to the first status time
                status_count: 0,       // Initialize status count
                statuses: []           // Initialize empty array for statuses
            };
        }

        // Push the status data into the incident's statuses array
        incidentMap[incidentId].statuses.push({
            shift_id: row.shift_id.toString(),
            employee_id: row.employee_id.toString(),
            time: row.time,
            description: row.description
        });

        // Update the status count
        incidentMap[incidentId].status_count++;
    });

    // Convert the incidentMap object into an array of incident documents
    const documents = Object.values(incidentMap);

    // save to file
    fs.writeFileSync(file, JSON.stringify(documents, null, 2));
    console.log(`✅ Migration completed. File saved as ${file}`);
}

export async function mapToIncidents(pool, file) {
    // simple SQL query (no JSON needed)
    let result = await pool.request().query(`
        SELECT 
            i.incident_ID,
            i.device_ID,
            i.report_time,
            i.repair_time,
            i.description,
            i.incident_status,
            ip.product_ID,
            ip.quantity
        FROM Incident i
        JOIN Incident_Parts ip ON i.incident_ID = ip.incident_ID
    `);


    // Create a map to accumulate incident data
    const incidentMap = {};

    // Process each row from the SQL result
    result.recordset.forEach(row => {
        const incidentId = row.incident_ID.toString(); // Incident ID as string

        // If the incident is not yet in the map, initialize an empty object for it
        if (!incidentMap[incidentId]) {
            incidentMap[incidentId] = {
                _id: incidentId, // MongoDB document ID
                device_id: row.device_ID.toString(),
                report_time: row.report_time,
                repair_time: row.repair_time || null,  // Null if no repair time
                description: row.description,
                incident_status: row.incident_status,
                parts_used: []  // Initialize empty array for parts used
            };
        }

        // Add the part to the parts_used array
        incidentMap[incidentId].parts_used.push({
            product_id: row.product_ID.toString(),
            quantity: row.quantity
        });
    });

    // Convert the incidentMap object into an array of incident documents
    const documents = Object.values(incidentMap);

    // save to file
    fs.writeFileSync(file, JSON.stringify(documents, null, 2));
    console.log(`✅ Migration completed. File saved as ${file}`);
}

export async function mapToDevices(pool, file) {
    // simple SQL query (no JSON needed)
    let result = await pool.request().query(`
        SELECT 
            device_ID,
            model,
            department_ID
        FROM Device
    `);


    // transform each row into MongoDB format
    const documents = result.recordset.map(row => ({
        _id: row.device_ID.toString(),
        model: row.model,
        department_id: row.department_ID.toString()
    }));

    // save to file
    fs.writeFileSync(file, JSON.stringify(documents, null, 2));
    console.log(`✅ Migration completed. File saved as ${file}`);
}

export async function mapToDepartments(pool, file) {
    // simple SQL query (no JSON needed)
    let result = await pool.request().query(`
        SELECT 
            d.department_ID,
            d.department_name,
            a.country,
            a.city,
            a.street,
            a.postal_code,
            a.coordinates.Long AS longitude,
            a.coordinates.Lat AS latitude
        FROM Department d
        JOIN Address a ON d.address_ID = a.address_ID
    `);


    // transform each row into MongoDB format
    const documents = result.recordset.map(row => ({
        _id: row.department_ID.toString(),
        department_name: row.department_name,
        address: {
            country: row.country,
            city: row.city,
            street: row.street,
            postal_code: row.postal_code,
            coordinates: {
                type: "Point",
                coordinates: [row.longitude, row.latitude]
            }
        }
    }));

    // save to file
    fs.writeFileSync(file, JSON.stringify(documents, null, 2));
    console.log(`✅ Migration completed. File saved as ${file}`);
}


export async function mapToOrders(pool, file) {
    // simple SQL query (no JSON needed)
    let result = await pool.request().query(`
        SELECT 
            o.order_id,
            o.client_id,
            o.department_id,
            o.order_date,
            o.order_status,
            o.invoice_id,
            a.address_id,
            a.country,
            a.city,
            a.street,
            a.postal_code,
            a.coordinates.Long AS longitude,
            a.coordinates.Lat AS latitude,
            op.product_id,
            op.quantity,
            op.status AS product_status
        FROM "Order" o
        LEFT JOIN Address a ON o.address_ID = a.address_ID
        LEFT JOIN Order_Product op ON o.order_id = op.order_id
    `);


    // Create a map to accumulate order data
    const orderMap = {};

    // Process each row from the SQL result
    result.recordset.forEach(row => {
        const orderId = row.order_id.toString(); // Order ID as string

        // If the order is not yet in the map, initialize an empty object for it
        if (!orderMap[orderId]) {
            orderMap[orderId] = {
                _id: orderId, // MongoDB document ID
                client_id: row.client_id,
                department_id: row.department_id.toString(),
                order_date: row.order_date,
                order_status: row.order_status,
                invoice_id: row.invoice_id,
                address: !row.address_id ? null : {
                    country: row.country,
                    city: row.city,
                    street: row.street,
                    postal_code: row.postal_code,
                    coordinates: {
                        type: "Point",
                        coordinates: [row.longitude, row.latitude]
                    }
                },
                products: []  // Initialize empty array for products
            };
        }

        // Add the product to the products array
        orderMap[orderId].products.push({
            product_id: row.product_id.toString(),
            quantity: row.quantity,
            status: row.product_status
        });
    });

    // Convert the orderMap object into an array of order documents
    const documents = Object.values(orderMap);

    // save to file
    fs.writeFileSync(file, JSON.stringify(documents, null, 2));
    console.log(`✅ Migration completed. File saved as ${file}`);
}

export async function mapToInvoices(pool, file) {
    // simple SQL query (no JSON needed)
    let result = await pool.request().query(`
        SELECT 
            i.invoice_id,
            i.client_id,
            i.company_name,
            i.nip,
            i.order_id,
            a.country,
            a.city,
            a.street,
            a.postal_code,
            a.coordinates.Long AS longitude,
            a.coordinates.Lat AS latitude
        FROM Invoice i
        JOIN Address a ON i.address_id = a.address_id
    `);


    // transform each row into MongoDB format
    const documents = result.recordset.map(row => ({
    _id: row.invoice_id.toString(), // or ObjectId later
    client_id: row.client_id,
    company_name: row.company_name.toString(),
    nip: row.nip,
    order_id: row.order_id,
    address: {
        country: row.country,
        city: row.city,
        street: row.street,
        postal_code: row.postal_code,
        coordinates: {
            type: "Point",
            coordinates: [row.longitude, row.latitude]
        }
    }
    // You can also join warehouse data later
    }));

    // save to file
    fs.writeFileSync(file, JSON.stringify(documents, null, 2));
    console.log(`✅ Migration completed. File saved as ${file}`);
}

export async function mapToClients(pool, file) {
    // simple SQL query (no JSON needed)
    let result = await pool.request().query(`
        SELECT 
            c.client_id,
            c.company_name,
            c.nip,
            a.country,
            a.city,
            a.street,
            a.postal_code,
            a.coordinates.Long AS longitude,
            a.coordinates.Lat AS latitude
        FROM Client c
        JOIN Client_Address ca ON c.client_ID = ca.client_ID
        JOIN Address a ON ca.address_id = a.address_id
    `);


    // Create a map to accumulate client data
    const clientMap = {};

    // Process each row from the SQL result
    result.recordset.forEach(row => {
        const clientId = row.client_id.toString(); // Client ID as string

        // If the client is not yet in the map, initialize an empty object for it
        if (!clientMap[clientId]) {
            clientMap[clientId] = {
                _id: clientId, // MongoDB document ID
                company_name: row.company_name,
                nip: row.nip,
                addresses: []  // Initialize empty array for addresses
            };
        }

        // Add the address to the client's addresses array
        clientMap[clientId].addresses.push({
            country: row.country,
            city: row.city,
            street: row.street,
            postal_code: row.postal_code,
            coordinates: {
                type: "Point", // GeoJSON type for coordinates
                coordinates: [row.longitude, row.latitude] // Coordinates from SQL query
            }
        });
    });

    // Convert the clientMap object into an array of client documents
    const documents = Object.values(clientMap);

    // save to file
    fs.writeFileSync(file, JSON.stringify(documents, null, 2));
    console.log(`✅ Migration completed. File saved as ${file}`);
}