# Instrukcje
## Cel 

Zmigrować relacyjną bazę danych firmy Masta-Blasta do MongoDB i zaprojektować nowy model danych, który optymalnie wykorzysta możliwości bazy dokumentowej: 


<ul>
  <li>osadzanie danych (embedded documents),  </li>
  <li>dokumenty z elastyczną strukturą (schema-less),  </li>
  <li>agregacje ($group, $project, $lookup, $unwind),  </li>
  <li>indeksy złożone i tekstowe,  </li>
  <li>geolokalizację (2dsphere),  </li>
  <li>i przechowywanie zagnieżdżonych struktur danych (arrays, documents, subdocuments).  </li>
</ul>



## Etapy 
Zaprojektuj model dokumentowy bazy MongoDB odpowiadający poprzedniej relacyjnej bazie lub jej wybranemu fragmentowi 
Dokonaj migracji danych lub części danych  
https://www.mongodb.com/developer/products/mongodb/easy-migration-relational-database-mongodb-relational-migrator<br />
W szczególności rozważ różne warianty osadzania i łączenia danych  
https://www.mongodb.com/docs/manual/applications/data-models-relationships/ 

 

## Zaimplementuj zapytania agregacyjne w MongoDB odpowiadające zapytaniom SQL z polecenia. 
### Przykładowe zapytania do implementacji: 

<ul>
  <li>Na jakiej zmianie urządzenie uległo awarii / zostało naprawione ($addFields, $cond, $hour)</li>
  <li>Czas postoju urządzenia ($subtract, $sum, $match)  </li>
  <li>Czas postoju urządzenia + Pomiń weekendy — filtruj z użyciem $dayOfWeek i $match  </li>
  <li>Ile % urządzeń jest w fazie awarii ($group, $count, $project) </li>
  <li>Który oddział miał najwięcej awarii w 2024 ($group, $match, $sort)</li>
  <li>Inne własne 3 propozycje </li>
</ul>

## Dodaj indeksy: 

<ul>
  <li>Tekstowy indeks na nazwie usterki </li>
  <li>Indeks geolokalizacyjny 2dsphere na departments.location </li>
  <li>Indeks na failures.start_time i failures.end_time </li>
</ul>


## W sprawozdaniu umieść: 

<ul>
  <li>ERD z poprzedniego zadania i schemat dokumentów MongoDB (np. w postaci drzewek lub JSON Schema) </li>
  <li>Opis nowej struktury danych </li>
  <li>Przykładowe dokumenty w JSON </li>
  <li>Skrypty agregacyjne odpowiadające zadanym pytaniom </li>
  <li>Porównanie podejść: relacyjnego vs dokumentowego </li>
  <li>Plusy migracji do MongoDB (wydajność, skalowalność, elastyczność) </li>
  <li>Szacunkowy rozmiar danych </li>
  <li>Screeny wyników zapytań z Compass / MongoShell </li>
</ul>

 
