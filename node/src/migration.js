import dotenv from "dotenv";
import sql from "mssql";
import { mapToProducts, mapToProductDetails, mapToWarehouse, mapToEmployee, mapToShifts, mapToIncidentStatuses, mapToIncidents, mapToDevices, mapToDepartments, mapToOrders, mapToInvoices, mapToClients } from "./mapping.js";


dotenv.config();

// SQL Server connection config
const config = {
  user: process.env.USER,
  password: process.env.PASSWORD,
  server: process.env.SERVER,   
  database: process.env.DATABASE,
  port: Number(process.env.PORT),
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};

async function migrateData() {
  try {
    // connect to SQL Server
    let pool = await sql.connect(config);

    await mapToProductDetails(pool, 'mapped-data/product_details.json');
    await mapToProducts(pool, 'mapped-data/products.json');
    await mapToWarehouse(pool, 'mapped-data/warehouses.json');
    await mapToEmployee(pool, 'mapped-data/employees.json');
    await mapToShifts(pool, 'mapped-data/shifts.json');
    await mapToIncidentStatuses(pool, 'mapped-data/incident_statuses.json');
    await mapToIncidents(pool, 'mapped-data/incidents.json');
    await mapToDevices(pool, 'mapped-data/devices.json');
    await mapToDepartments(pool, 'mapped-data/departments.json');
    await mapToOrders(pool, 'mapped-data/orders.json');
    await mapToInvoices(pool, 'mapped-data/invoices.json');
    await mapToClients(pool, 'mapped-data/clients.json');

    sql.close();
  } catch (err) {
    console.error('❌ Error:', err);
    sql.close();
  }
}

migrateData();
