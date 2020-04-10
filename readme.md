# Script um offene Fenster pro Raum und insgesamt zu zählen sowie offen/zu States anzulegen und eine pro Raum konfigurierbare Lüftungsempfehlung (zeitbezogen) zu geben. 

#### Kann beliebige Tür/Fenster Kontakte verwenden.
#### Berücksichtigt mehrflügelige Fenster bzw. mehrere Fenster pro Raum.
#### Legt pro Raum drei Datenpunkte an (Raumfensteroffenzähler, Raumfensterstatus und das Einstellfeld für die Lüftungsempfehlung), sowie vier Datenpunkte fürs gesamte.
#### Möglichkeit eine Meldung/Ansage via Mail/Telegram/Alexa nach x Minuten einmalig oder zyklisch bis Fensterschließung auszugeben.
#### Gibt dynamische HTML Tabelle mit Übersicht aller Räume und farblicher Kennzeichnug der jeweiligen Stati aus.

# WICHTIG!!!
### Vorraussetzungen: Den Geräten müssen Räume zugewiesen sein, sowie eine Funktion, z.B. "Verschluss" für jeden entsprechenden Datenpunkt.  
**Aber nur für den Datenpunkt, nicht den gesamten Channel!!!**  

![fensteroffentut1.jpg](/admin/fensteroffentut1.jpg) 

# Installation
1. Wenn noch nicht geschehen, allen gewünschten Sensoren einen Raum und eine Funktion zuweisen. Die Funktion muss vorher in den Aufzählungen hinzugefügt werden und könnte z.B. "Verschluss" lauten. Soll ein anderer Begriff verwendet werden, muss dies dann auch im Script, Zeile 11 geändert werden. **Nach der Zuweisung, bzw. dem anlegen neuer Aufzählungspunkte ist es oft hilfreich die JS Instanz neu zu starten da diese bei Aufzählungsänderungen gerne mal "zickt" was dann zu Skriptfehlern führt**.
2. Das Skript in ein neues JS Projekt kopieren.
![fensteroffentut4.jpg](/admin/fensteroffentut4.jpg) 
![fensteroffentut5.jpg](/admin/fensteroffentut5.jpg) 
3. Zeile 9-35 kontrollieren und bei Bedarf anpassen, siehe Beschreibungen direkt neben den Variablen.
4. Zeile 19-24 wäre der richtige Ort falls Telegram, Alexa etc. die Meldungen ausgeben sollen.
5. Skript starten
6. In den Objekten, unter Javascript.0.FensterUeberwachung sollte es jetzt für jeden definierten Raum einen Channel mit drei Datenpunkten geben:
   1. IsOpen: Ist in diesem Raum ein oder mehrere Fenster geöffnet?
   2. RoomOpenWindowCount: Anzahl der in diesem Raum geöffneten Fenster, 0 wenn alle geschlossen.
   3. VentWarnTime: Einstellfeld für die Anzahl Tage nach denen eine Lüftungsempfehlung ausgegeben wird. Lüftungsempfehlung ist bei 0 für diesen Raum deaktiviert.

4. Zusätzlich werden 4 weitere Datenpunkte in der Skript Root angelegt:
   1.  AlleFensterZu: Gesamtstatus aller Räume/Fenster
   2.  WindowsOpen: Anzahle der offenen Fenster über alle Räume summiert.
   3.  RoomsWithOpenWindows: Eine Textliste von Räumen mit geöffneten Fenstern und deren Anzahl. Sinnvoll für Kurzfassungsanzeigen in Vis
   4. OverviewTable: Dynamisch erzeugte HTML Tabelle mit allen Räumen und den jeweiligen Fensterstati. Verwendung in Vis als Binding: **{javascript.0.FensterUeberwachung.OverviewTable}** in einem HTML Widget, optimale Breite 310px, Hintergrundfarbe nach Wahl.  
 
![fensteroffentut3.jpg](/admin/fensteroffentut3.jpg) 

Es werden drei Icons aus dem Satz: *"icons-mfd-svg"* verwendet. Solltet Ihr diese nicht installiert haben, so könnt Ihr dies nachholen (wird als Adapter installiert) oder beliebige eigene Icons verwenden, hierzu muß dann jedoch der Name und Pfad im Skript, Zeile 27 - 29 angepasst werden. Sieht dann z.B. so aus:  

![fensteroffentut2b.png](/admin/fensteroffentut2b.png)  

All diese Datenpunkte könnt Ihr jetzt z.B. in Vis verwenden um offene Fenster pro Raum anzuzeigen. Es wird dabei berücksichtigt dass es mehrere Fenster pro Raum, bzw. mehrflügelige Fenster geben kann.

# Changelog
#### 9.4.20 (V 1.3.0)
- Add: Unterstriche werden in Meldungen nun als Leerzeichen ausgegeben. Ae, ue, oe, wird in Meldungen nun als ä, ü, ö ausgegeben.
- Change: offen/geschlossen Zeiten werden nicht mehr als Zeitstempel angezeigt sondern die jeweilige Dauer berechnet und minütlich aktualisiert.
- Add: Pro Raum konfigurierbare Lüftungsempfehlung integriert. Bei Skriptneustarts wird bereits vorhandene geschlossen Zeit berücksichtigt.
- Change: Tabellenfarben jetzt heller / freundlicher.
- Fix: Ignorieren von geöffneten Fenstern bei Skriptstart behoben, wenn diese in einem Raum mit mehreren/zweiflügeligen Fenstern waren und das geöffnete Fenster in der Aufzählung vor dem geschlossenen gelistet war.
#### 1.4.20 (V 1.2.3) Add: Tabellendatumsformatierung ist jetzt in Einstellungen konfigurierbar.
#### 31.3.20 (V1.2.2)
- Add: Benachrichtigung via Mail hinzugefügt.  
 - Add: Option hinzugefügt um auch erstmaliges öffnen sowie schliessen zu melden.
- Change: Zeitausgaben werden nun auf eine Nachkommastelle gerundet.
#### 29.3.20 (V1.2.1)Add: Möglichkeit integriert die Tabelle ohne Kopf darzustellen
#### 28.3.20 (V1.2.0)Add: Dynamisch erstellte HTML Übersichtstabelle über alle Räume/Fenster  
#### 25.3.20 (V1.1.7) Add: HMIP Drehgriffe integriert; Statebezeichnungen für auf/zu jetzt User-konfigurierbar -erweiterbar  
#### 23.3.20 (V1.1.6)Add: Neuer Datenpunkt mit Textübersicht ausschliesslich der Räume mit geöffneten Fenstern  
#### 22.3.20 (V1.1.5) Bugfix für HM Drehgriff Sensoren, Logging erweitert
#### 5.2.20 (V1.1.4)Add: Fehlerabfangroutinen integriert  
#### 3.2.20 (V1.1.3) Kleinere Bugfixes und upload zu git  
#### 1.2.20 (V1.1.2) Add: Möglichkeit eine Ansage nach x Minuten einmalig oder zyklisch bis Fensterschließung anzugeben.  
#### 14.1.20 (V1.1.1) Add: "Offen" erweitert um "Open", "Tilted", "Gekippt"  
#### 9.8.19 (V1.1.0) Zählung der Fenster gesamt ausgeweitet auf Fenster pro Raum  
#### 4.8.19 Init  (V1.0.0)

