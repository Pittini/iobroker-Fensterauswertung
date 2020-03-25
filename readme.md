# Script um offene Fenster pro Raum und insgesamt zu zählen sowie offen/zu States anzulegen. 

#### Kann beliebige Tür/Fenster Kontakte verwenden.
#### Berücksichtigt mehrflügelige Fenster bzw. mehrere Fenster pro Raum.
#### Legt pro Raum zwei Datenpunkte an (Raumfensteroffenzähler und Raumfensterstatus), sowie zwei Datenpunkte fürs gesamte.
#### Möglichkeit eine Meldung/Ansage nach x Minuten einmalig oder zyklisch bis Fensterschließung auszugeben

# WICHTIG!!!
### Vorraussetzungen: Den Geräten müssen Räume zugewiesen sein, sowie eine Funktion, z.B. "Verschluss" für jeden entsprechenden Datenpunkt. **Aber nur für den Datenpunkt, nicht den gesammten Channel!!!**
![fensteroffentut1.jpg](/admin/fensteroffentut1.jpg) 

# Installation
1. Wenn noch nicht geschehen, allen gewünschten Sensoren einen Raum und eine Funktion zuweisen. Die Funktion muss vorher in den Aufzählungen hinzugefügt werden und könnte z.B. "Verschluss" lauten. Soll ein anderer Begriff verwendet werden, muss dies dann auch im Script, Zeile 11 geändert werden.
2. Das Skript in ein neues JS Projekt kopieren.
3. Zeile 7-21 kontrollieren und bei Bedarf anpassen
4. Zeile 14-16 wäre der richtige Ort falls Telegram, Alexa etc. die Meldungen ausgeben sollen.
5. In den Objekten, unter Javascript.0.FensterUeberwachung sollte es jetzt für jeden definierten Raum einen Datenpunkt geben, sowie die beiden gesamt Datenpunkte welche Alle Fenster zählen und den Gesamtstatus ausgeben. All diese Datenpunkte könnt Ihr jetzt z.B. in Vis verwenden um offene Fenster pro Raum anzuzeigen. Es wird dabei berücksichtigt dass es mehrere Fenster pro Raum, bzw. mehrflügelige Fenster geben kann.

# Changelog
#### 25.3.20 Add: HMIP Drehgriffe integriert; Statebezeichnungen für auf/zu jetzt User-konfigurierbar -erweiterbar
#### 23.3.20 Add: Neuer Datenpunkt mit Textübersicht ausschliesslich der Räume mit geöffneten Fenstern
#### 22.3.20 Bugfix für HM Drehgriff Sensoren, Logging erweitert
#### 5.2.20 Add: Fehlerabfangroutinen integriert
#### 3.2.20 Kleinere Bugfixes und upload zu git  
#### 1.2.20 Add: Möglichkeit eine Ansage nach x Minuten einmalig oder zyklisch bis Fensterschließung anzugeben.  
#### 14.1.20 Add: "Offen" erweitert um "Open", "Tilted", "Gekippt"  
#### 9.8.19 Zählung der Fenster gesamt ausgeweitet auf Fenster pro Raum  
#### 4.8.19 Init  

