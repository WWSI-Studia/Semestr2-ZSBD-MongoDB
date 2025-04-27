Instrukcje
Cel 

Zmigrować relacyjną bazę danych firmy Masta-Blasta do MongoDB i zaprojektować nowy model danych, który optymalnie wykorzysta możliwości bazy dokumentowej: 

osadzanie danych (embedded documents), 
dokumenty z elastyczną strukturą (schema-less), 
agregacje ($group, $project, $lookup, $unwind), 
indeksy złożone i tekstowe, 
geolokalizację (2dsphere), 
i przechowywanie zagnieżdżonych struktur danych (arrays, documents, subdocuments). 
Etapy 

Zaprojektuj model dokumentowy bazy MongoDB odpowiadający poprzedniej relacyjnej bazie lub jej wybranemu fragmentowi 

Dokonaj migracji danych lub części danych  

https://www.mongodb.com/developer/products/mongodb/easy-migration-relational-database-mongodb-relational-migrator/ 

W szczególności rozważ różne warianty osadzania i łączenia danych  

https://www.mongodb.com/docs/manual/applications/data-models-relationships/ 

 

Zaimplementuj zapytania agregacyjne w MongoDB odpowiadające zapytaniom SQL z polecenia. 

Przykładowe zapytania do implementacji: 

Na jakiej zmianie urządzenie uległo awarii / zostało naprawione ($addFields, $cond, $hour) 
Czas postoju urządzenia ($subtract, $sum, $match) 
Czas postoju urządzenia + Pomiń weekendy — filtruj z użyciem $dayOfWeek i $match 
Ile % urządzeń jest w fazie awarii ($group, $count, $project) 
Który oddział miał najwięcej awarii w 2024 ($group, $match, $sort) 
Inne własne 3 propozycje 
  Dodaj indeksy: 

Tekstowy indeks na nazwie usterki 
Indeks geolokalizacyjny 2dsphere na departments.location 
Indeks na failures.start_time i failures.end_time 
W sprawozdaniu umieść: 

ERD z poprzedniego zadania i schemat dokumentów MongoDB (np. w postaci drzewek lub JSON Schema) 
Opis nowej struktury danych 
Przykładowe dokumenty w JSON 
Skrypty agregacyjne odpowiadające zadanym pytaniom 
Porównanie podejść: relacyjnego vs dokumentowego 
Plusy migracji do MongoDB (wydajność, skalowalność, elastyczność) 
Szacunkowy rozmiar danych 
Screeny wyników zapytań z Compass / MongoShell 
 
