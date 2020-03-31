# Script um offene Fenster pro Raum und insgesamt zu zählen sowie offen/zu States anzulegen. 

#### Kann beliebige Tür/Fenster Kontakte verwenden.
#### Berücksichtigt mehrflügelige Fenster bzw. mehrere Fenster pro Raum.
#### Legt pro Raum zwei Datenpunkte an (Raumfensteroffenzähler und Raumfensterstatus), sowie vier Datenpunkte fürs gesamte.
#### Möglichkeit eine Meldung/Ansage via Mail/Telegram/Alexa nach x Minuten einmalig oder zyklisch bis Fensterschließung auszugeben.
#### Gibt dynamische HTML Tabelle mit Übersicht aller Räume aus.

# WICHTIG!!!
### Vorraussetzungen: Den Geräten müssen Räume zugewiesen sein, sowie eine Funktion, z.B. "Verschluss" für jeden entsprechenden Datenpunkt. **Aber nur für den Datenpunkt, nicht den gesamten Channel!!!**
![fensteroffentut1.jpg](/admin/fensteroffentut1.jpg) 

# Installation
1. Wenn noch nicht geschehen, allen gewünschten Sensoren einen Raum und eine Funktion zuweisen. Die Funktion muss vorher in den Aufzählungen hinzugefügt werden und könnte z.B. "Verschluss" lauten. Soll ein anderer Begriff verwendet werden, muss dies dann auch im Script, Zeile 11 geändert werden. **Nach der Zuweisung, bzw. dem anlegen neuer Aufzählungspunkte ist es oft hilfreich die JS Instanz neu zu starten da diese bei Aufzählungsänderungen gerne mal "zickt" was dann zu Skriptfehlern führt**.
2. Das Skript in ein neues JS Projekt kopieren.
![fensteroffentut4.jpg](/admin/fensteroffentut4.jpg) 
![fensteroffentut5.jpg](/admin/fensteroffentut5.jpg) 
3. Zeile 9-29 kontrollieren und bei Bedarf anpassen, siehe Beschreibungen direkt neben den Variablen.
4. Zeile 15-18 wäre der richtige Ort falls Telegram, Alexa etc. die Meldungen ausgeben sollen.
5. Skript starten
6. In den Objekten, unter Javascript.0.FensterUeberwachung sollte es jetzt für jeden definierten Raum einen Datenpunkt geben, sowie 4 weitere Datenpunkte:
* AlleFensterZu: Gesamtstatus aller Räume/Fenster
* OverviewTable: Dynamisch erzeugte HTML Tabelle mit allen Räumen und den jeweiligen Fensterstati. Verwendung in Vis als Binding: **{javascript.0.FensterUeberwachung.OverviewTable}** in einem HTML Widget, optimale Breite 310px, Hintergrundfarbe nach Wahl.  
 
![fensteroffentut3.jpg](/admin/fensteroffentut3.jpg) 

Es werden zwei Icon aus dem Satz: *"icons-mfd-svg"* verwendet. Solltet Ihr diese nicht installiert haben, so könnt Ihr dies nachholen (wird als Adapter installiert) oder beliebige eigene Icons verwenden, hierzu muß dann jedoch der Name und Pfad im Skript, Zeile 23 und 24 angepasst werden. Sieht dann z.B. so aus:  
![fensteroffentut2.png](/admin/fensteroffentut2.png)  

* RoomsWithOpenWindows: Textfeld mit Räumen in denen Fenster geöffnet sind, inkl. deren Anzahl. Als Trennzeichen wird hier ein HTML Umbruch (<br) verwendet, dies ist im Skript konfigurierbar.
*  WindowsOpen: Die Anzahl der gesamt geöffneten Fenster.   

All diese Datenpunkte könnt Ihr jetzt z.B. in Vis verwenden um offene Fenster pro Raum anzuzeigen. Es wird dabei berücksichtigt dass es mehrere Fenster pro Raum, bzw. mehrflügelige Fenster geben kann.

# Changelog
#### 31.3.20 
- Add: Benachrichtigung via Mail hinzugefügt.  
 - Add: Option hinzugefügt um auch erstmaliges öffnen sowie schliessen zu melden.
- Change: Zeitausgaben werden nun auf eine Nachkommastelle gerundet.
#### 29.3.20 Add: Möglichkeit integriert die Tabelle ohne Kopf darzustellen
#### 28.3.20 Add: Dynamisch erstellte HTML Übersichtstabelle über alle Räume/Fenster  
#### 25.3.20 Add: HMIP Drehgriffe integriert; Statebezeichnungen für auf/zu jetzt User-konfigurierbar -erweiterbar  
#### 23.3.20 Add: Neuer Datenpunkt mit Textübersicht ausschliesslich der Räume mit geöffneten Fenstern  
#### 22.3.20 Bugfix für HM Drehgriff Sensoren, Logging erweitert
#### 5.2.20 Add: Fehlerabfangroutinen integriert  
#### 3.2.20 Kleinere Bugfixes und upload zu git  
#### 1.2.20 Add: Möglichkeit eine Ansage nach x Minuten einmalig oder zyklisch bis Fensterschließung anzugeben.  
#### 14.1.20 Add: "Offen" erweitert um "Open", "Tilted", "Gekippt"  
#### 9.8.19 Zählung der Fenster gesamt ausgeweitet auf Fenster pro Raum  
#### 4.8.19 Init  

