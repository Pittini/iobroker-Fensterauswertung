## Script um offene Fenster pro Raum und insgesamt zu zählen sowie offen/zu/gekippt States anzulegen und eine pro Raum konfigurierbare Lüftungsempfehlung (zeitbezogen) zu geben. Direkte Ausgabe aller Stati via HTML Tabelle. Flexibel konfigurierbar.

### Features
- #### Kann beliebige Tür/Fenster Kontakte verwenden. Noch nicht erfasste Varianten können über die Einstellungen hinzugefügt werden.
- #### Berücksichtigt mehrflügelige Fenster bzw. mehrere Fenster pro Raum.
- #### Legt pro Raum sieben Datenpunkte an (Raumfensteroffenzähler, Raumfenstergekipptzähler, Raumfensterstatus und die Einstellfelder für die Lüftungsempfehlung und welche Nachrichten Ihr haben möchtet), sowie 10 Datenpunkte fürs gesamte. (Siehe Beschreibung der Datenpunkte weiter unten)
- #### Möglichkeit eine Meldung/Ansage via Mail/Telegram/Alexa nach x Minuten einmalig oder zyklisch bis Fensterschließung auszugeben. 
- #### Meldungen können bei Bedarf über einen Mute Datenpunkt entweder gesamt oder nur für Sprachnachrichten stummgeschaltet werden.
- #### Gibt dynamische HTML Tabelle mit Übersicht aller Räume und farblicher Kennzeichnug der jeweiligen Stati aus. Verwendete Bilder und Farben sind frei konfigurierbar.
- #### Gibt zeitbezogene Lüftungswarnung aus wenn Fenster für Zeit x (pro Raum einstellbar) nicht geöffnet wurden.
- #### Gibt Liste mit Räumen für welche aktuell eine Fensteroffen Warnung besteht aus.
- #### Gibt Liste mit Räumen in denen gekippte Fenster sind aus.
- #### Gibt Liste mit Räumen für welche aktuell eine Lüftungs Warnung besteht aus.
- #### Kann kurze auf/zu Änderungen innerhalb Zeit x (einstellbar) ignorieren.

# WICHTIG!!!
### Vorraussetzungen: Den Geräten müssen Räume zugewiesen sein, sowie eine Funktion, z.B. "Verschluss" für jeden entsprechenden Datenpunkt.  
### **<span style="color:red">Aber nur für den Datenpunkt, nicht den gesamten Channel!!!</span>**  

![fensteroffentut1.jpg](/admin/fensteroffentut1.jpg) 

# Installation
1. Wenn noch nicht geschehen, allen gewünschten Sensoren einen Raum und eine Funktion zuweisen. Die Funktion muss vorher in den Aufzählungen hinzugefügt werden und könnte z.B. "Verschluss" lauten. Soll ein anderer Begriff verwendet werden, muss dies dann auch im Script, Zeile 11 geändert werden. **Nach der Zuweisung, bzw. dem anlegen neuer Aufzählungspunkte ist es oft hilfreich die JS Instanz neu zu starten da diese bei Aufzählungsänderungen gerne mal "zickt" was dann zu Skriptfehlern führt**.
2. Das Skript in ein neues JS Projekt kopieren.
![fensteroffentut4.jpg](/admin/fensteroffentut4.jpg) 
![fensteroffentut5.jpg](/admin/fensteroffentut5.jpg) 
3. Zeile 9-44 kontrollieren und bei Bedarf anpassen, siehe Beschreibungen direkt neben den Variablen.
4. Zeile 18-23 wäre der richtige Ort falls Telegram, Alexa etc. die Meldungen ausgeben sollen.
5. Skript starten
6. In den Objekten, unter Javascript.0.FensterUeberwachung sollte es jetzt für jeden definierten Raum einen Channel mit sieben Datenpunkten geben:
   1. IsOpen (readonly): Ist in diesem Raum ein oder mehrere Fenster geöffnet?
   2. RoomOpenWindowCount (readonly): Anzahl der in diesem Raum geöffneten (inkl. der gekippten!) Fenster, 0 wenn alle geschlossen.
   3. RoomTiltedWindowCount (readonly): Anzahl der in diesem Raum gekippten Fenster, 0 wenn alle geschlossen.
   4. VentWarnTime: Einstellfeld für die Anzahl Tage nach denen eine Lüftungsempfehlung ausgegeben wird. Lüftungsempfehlung ist bei 0 für diesen Raum deaktiviert.
   5. SendVentMsg: Einstellfeld ob Ihr für diesen Raum eine Lüftungswarnung haben möchtet.
   6. SendOpenCloseMsg: Einstellfeld ob Ihr für diesen Raum eine Benachrichtigung für das erste Öffnen und das letzte Schließen der/des Fensters haben möchtet.
   7. SendWarnMsg: Einstellfeld ob Ihr für diesen Raum eine Offenwarnung haben möchtet.

7. Zusätzlich werden 10 weitere Datenpunkte in der Skript Root angelegt:
   1.  AlleFensterZu: Gesamtstatus aller Räume/Fenster
   2.  WindowsOpen: Anzahl der offenen Fenster über alle Räume summiert (inkl. der gekippten Fenster!).
   3.  WindowsTilted: Anzahl der gekippten Fenster über alle Räume summiert.
   4.  RoomsWithOpenWindows: Eine Textliste von Räumen mit geöffneten Fenstern und deren Anzahl, sowie die Untermenge der davon gekippten Fenster (Funktioniert natürlich nur wenn entsprechende Sensoren verwendet werden die gekippt als Status melden). Sinnvoll für Kurzfassungsanzeigen in Vis.
   5.  RoomsWithTiltedWindows: Eine Textliste von Räumen mit gekippten Fenstern und deren Anzahl. Sinnvoll für Kurzfassungsanzeigen in Vis (Funktioniert natürlich nur wenn entsprechende Sensoren verwendet werden die gekippt als Status melden). 
   6.  RoomsWithVentWarning: Eine Textliste von Räumen bei denen eine Lüftungswarnung besteht.
   7.  LastMessage: Die zuletzt ausgegebene Nachricht. Ermöglicht es die Meldungen mit History zu erfassen oder mit Vis auszugeben.
   8.  MessageLog: Ein kleines Log der ausgegebenen Meldungen mit Zeitstempel. Zeitstempel Format und max. Anzahl der Logeinträge in den Einstellungen konfigurierbar. Default Trennzeichen ist ">br>", somit kann die Liste direkt in einem HTML Widget via Binding (**{javascript.0.FensterUeberwachung.MessageLog}**) in Vis ausgegeben werden.
   9.  OverviewTable: Dynamisch erzeugte HTML Tabelle mit allen Räumen und den jeweiligen Fensterstati. Verwendung in Vis als Binding: **{javascript.0.FensterUeberwachung.OverviewTable}** in einem HTML Widget, optimale Breite 310px, Hintergrundfarbe, Schriftfarbe und Schriftart nach Wahl.  
   10. MuteMode: Bietet die Möglichkeit via Datenpunkt z.B. nachts Nachrichtenausgaben zu verhindern. 
        - 0 = Alle Ansagen werden ausgegeben. 
        - 1 = "Stumme" Nachrichten via Telegram/Mail etc. werden ausgegeben, Sprachausgaben geblockt. 
        - 2 = Alle Nachrichten werden geblockt.
 
![fensteroffentut3.jpg](/admin/fensteroffentut3.jpg) 

Es werden drei Icons aus dem Satz: *"icons-mfd-svg"* verwendet. Solltet Ihr diese nicht installiert haben, so könnt Ihr dies nachholen (wird als Adapter installiert) oder beliebige eigene Icons verwenden, hierzu muß dann jedoch der Name und Pfad im Skript, Zeile 27 - 29 angepasst werden. Sieht dann z.B. so aus:  

![fensteroffentut2b.png](/admin/fensteroffentut2b.png)  

All diese Datenpunkte könnt Ihr jetzt z.B. in Vis verwenden um offene Fenster pro Raum anzuzeigen. Es wird dabei berücksichtigt dass es mehrere Fenster pro Raum, bzw. mehrflügelige Fenster geben kann.

# Changelog
#### 24.4.20 (V 1.5.0)
- Add: Nachrichtenausgabe kann nun in den Raumdatenpunkten pro Raum konfiguriert werden. Hierzu die Datenpunkte: SendOpenCloseMsg, SendVentMsg und SendWarnMsg angelegt.
- Add: In den Skripteinstellungen, MaxMsg hinzugefügt. Hier kann festgelegt werden wieviele Nachrichten Ihr maximal pro Raum erhalten möchtet. Wegfall der Option RepeatInfoMsg, da dies durch MaxMsg=1 konfiguriert werden kann.
- Add: Zusätzlicher Status "gekippt". Ausgabe der entsprechenden Werte sowohl als Gesamtzählung, als Liste, als auch pro Raum. Entsprechende Änderung der Texte (Wenn Fenster im Raum nur gekippt, Ausgabe Fenster gekippt, wenn nur offen, Ausgabe Fenster offen, wenn Fenster im Raum sowohl gekippt als auch offen, Ausgabe x Fenster offen, davon x Fenster gekippt). Zusätzliche Farbe und Bild für HTML Tabelle.
- Fix: Problem mit inkorrekten Lüftungswarnungen nach öffnen/schliessen innerhalb Berechnungstimeout.
- Add: Kurzzeitige (Zeit einstellbar) öffnen/schliessen Aktionen werden nun ignoriert (z.B. mal schnell aus dem Fenster guggen)
#### 17.4.20 (V 1.4.3)
- Add: Zusätzliche Logpunkte.
- Fix: Problem mit inkorrekten Lüftungswarnungen nach Initphase.
#### 13.4.20 (V 1.4.2)
- Add: Zusätzlicher Datenpunkt "MuteMode" in der Skript Root eingefügt.
- Add: Zusätzlicher Datenpunkt "RoomsWithVentWarning" in der Skript Root eingefügt.
#### 12.4.20 (V 1.4.0)
- Add: Zusätzlicher Datenpunkt "LastMessage" in der Skript Root eingefügt.
- Add: Zusätzlicher Datenpunkt "MessageLog" in der Skript Root eingefügt.
- Change: Tabelle, Defaultfarben an MaterialDesign2 Farben angepasst. Schriftgrößenfestlegung von em auf px und Tabellenaufbau geändert um bessere Kompatibilität mit MD2 zu erreichen.
- Add: Tabelle, Überschrift, Zusammenfassung und Detailbereich können nun in den Einstellungen deaktiviert werden.
- Add: Bilder können in Einstellungen invertiert werden.
- Change: Tabelle, Bilder horizontal zentriert.
- Change: Zur besseren Verständlichkeit einige Einstellungskonstanten umbenannt.
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

