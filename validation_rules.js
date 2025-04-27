var validationRules = {
  invoice: 'Brak reguł walidacji',
  order: '{\n' +
    '  "$jsonSchema": {\n' +
    '    "bsonType": "object",\n' +
    '    "required": [\n' +
    '      "_id",\n' +
    '      "address_id",\n' +
    '      "department_id",\n' +
    '      "invoice_number",\n' +
    '      "order_date",\n' +
    '      "order_status",\n' +
    '      "products"\n' +
    '    ],\n' +
    '    "properties": {\n' +
    '      "_id": {\n' +
    '        "bsonType": "objectId"\n' +
    '      },\n' +
    '      "address_id": {\n' +
    '        "bsonType": "objectId"\n' +
    '      },\n' +
    '      "department_id": {\n' +
    '        "bsonType": "objectId"\n' +
    '      },\n' +
    '      "invoice_number": {\n' +
    '        "bsonType": "string"\n' +
    '      },\n' +
    '      "order_date": {\n' +
    '        "bsonType": "date"\n' +
    '      },\n' +
    '      "order_status": {\n' +
    '        "bsonType": "string"\n' +
    '      },\n' +
    '      "products": {\n' +
    '        "bsonType": "array",\n' +
    '        "items": {\n' +
    '          "bsonType": "object",\n' +
    '          "properties": {\n' +
    '            "product_id": {\n' +
    '              "bsonType": "objectId"\n' +
    '            },\n' +
    '            "quantity": {\n' +
    '              "bsonType": "int"\n' +
    '            },\n' +
    '            "status": {\n' +
    '              "bsonType": "string"\n' +
    '            }\n' +
    '          },\n' +
    '          "required": [\n' +
    '            "product_id",\n' +
    '            "quantity",\n' +
    '            "status"\n' +
    '          ]\n' +
    '        }\n' +
    '      }\n' +
    '    }\n' +
    '  }\n' +
    '}',
  device: 'Brak reguł walidacji',
  department: 'Brak reguł walidacji',
  client: 'Brak reguł walidacji',
  product: 'Brak reguł walidacji',
  employee: 'Brak reguł walidacji',
  incident: 'Brak reguł walidacji',
  incident_statuses: 'Brak reguł walidacji',
  shift: 'Brak reguł walidacji',
  warehouse: 'Brak reguł walidacji'
};