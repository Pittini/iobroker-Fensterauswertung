//Script um offene Fenster pro Raum und insgesamt zu zählen. Legt pro Raum zwei Datenpunkte an, sowie zwei Datenpunkte fürs gesamte.
//Möglichkeit eine Ansage nach x Minuten einmalig oder zyklisch bis Fensterschließung anzugeben

//WICHTIG!!!
//Vorraussetzungen: Den Geräten müssen Räume zugewiesen sein, sowie die Funktion "Verschluss" für jeden entsprechenden Datenpunkt zugewiesen sein.

const praefix = "javascript.0.FensterUeberwachung."; //Grundpfad für Script DPs
const ZeitBisNachricht = 300000 // 300000 ms = 5 Minuten
const RepeatInfoMsg = true; // Legt fest ob Ansage einmalig oder zyklisch
const InfoMsgAktiv = true; // Legt fest ob eine Infonachricht nach x Minuten ausgegeben werden soll
const WelcheFunktionVerwenden = "Verschluss"; // Legt fest nach welchem Begriff in Funktionen gesucht wird.

function Meldung(msg) {
    Say(msg);
    log(msg);
};

//Ab hier nix mehr ändern
let OpenWindowCount = 0; // Gesamtzahl der geöffneten Fenster
let RoomOpenWindowCount = []; // Array für offene Fenster pro Raum
let OpenWindowMsgHandler = []; // Objektarray für timeouts pro Raum
let Sensor = [] //Sensoren als Array anlegen
let Laufzeit = [];

var Funktionen = getEnums('functions');
for (var x in Funktionen) {        // loop ueber alle Functions
    var Funktion = Funktionen[x].name;

    if (Funktion == undefined) {
        log("Keine Funktion gefunden");
    }
    else {
        if (typeof Funktion == 'object') Funktion = Funktion.de;
        var members = Funktionen[x].members;
        if (Funktion == WelcheFunktionVerwenden) { //Wenn Function ist Verschluss
            for (let y in members) { // Loop über alle Verschluss Members
                Sensor[y] = members[y];
                let room = getObject(Sensor[y], 'rooms').enumNames[0];
                if (typeof room == 'object') room = room.de;
                //Datenpunkte pro Raum anlegen
                createState(praefix + room + ".RoomOpenWindowCount", 0, false, { read: true, write: true, name: "Anzahl der geöffneten Fenster im Raum", type: "number", def: 0 });
                createState(praefix + room + ".IsOpen", false, false, { read: true, write: true, name: "Fenster offen?", type: "boolean", role: "state", def: false }); //
                //log(Funktion + ': ' + room);
                RoomOpenWindowCount[y] = 0; // Array mit 0 initialisieren
                Laufzeit[y] = 0; // Array mit 0 initialisieren
            };
        };
    };
};

//Struktur anlegen in js.0 um Sollwert und Summenergebniss zu speichern
//Generischen Datenpunkt anlegen 
createState(praefix + "AlleFensterZu", true, false, { read: true, write: true, name: "Fenster zu?", type: "boolean", role: "state", def: true }); //
createState(praefix + "WindowsOpen", 0, false, { read: true, write: true, name: "Anzahl der geöffneten Fenster", type: "number", def: 0 });

let SensorVal = []; //SensorDatenpunkten Array zuweisen

for (let x = 0; x < Sensor.length; x++) {
    SensorVal[x] = getState(Sensor[x]).val; // Wert von Sensor in Schleife einlesen
    //log(SensorVal[x]);
};

function GetRoom(x) { // Liefert den Raum von Sensor x
    let room = getObject(Sensor[x], 'rooms').enumNames[0];
    if (room == undefined) {
        log("Kein Raum definiert");
        return "Kein Raum definiert";
    };
    if (typeof room == 'object') room = room.de;
    return room;
};

function CheckWindow(x) { //Für einzelenes Fenster. Via Trigger angesteuert.
    //log(getObject(SensorPraefix+Sensor[x], 'rooms').enumNames.join(', '));
    if (SensorVal[x] == true || SensorVal[x] == "offen" || SensorVal[x] == "gekippt" || SensorVal[x] == "open" || SensorVal[x] == "tilted") { //Fenster is offen
        Laufzeit[x] = 0;
        OpenWindowCount = OpenWindowCount + 1;
        RoomOpenWindowCount[x] = getState(praefix + GetRoom(x) + ".RoomOpenWindowCount").val + 1;
        //log(RoomOpenWindowCount[x])
        setState(praefix + "AlleFensterZu", false);
        setState(praefix + GetRoom(x) + ".IsOpen", true);
        setState(praefix + "WindowsOpen", OpenWindowCount);
        setState(praefix + GetRoom(x) + ".RoomOpenWindowCount", RoomOpenWindowCount[x]);

        //log(GetRoom(x) + " Fenster geöffnet");
        //WriteEventLog(GetRoom(x) + " Fenster geöffnet!");
        if (InfoMsgAktiv == true) {
            if (RepeatInfoMsg == true) { // Wenn Intervallmeldung eingestellt Interval starten und Dauer bei Ansage aufaddieren
                OpenWindowMsgHandler[x] = setInterval(function () {
                    Laufzeit[x] = Laufzeit[x] + ZeitBisNachricht;
                    Meldung(GetRoom(x) + "fenster seit " + Laufzeit[x] / 1000 / 60 + " Minuten geöffnet!");
                }, ZeitBisNachricht);
            }
            else {
                OpenWindowMsgHandler[x] = setTimeout(function () { // Wenn einmalige Meldung eingestellt
                    Meldung(GetRoom(x) + "fenster seit " + ZeitBisNachricht / 1000 / 60 + " Minuten geöffnet!");
                }, ZeitBisNachricht);
            };
        };
    }
    else {
        OpenWindowCount = OpenWindowCount - 1;
        RoomOpenWindowCount[x] = getState(praefix + GetRoom(x) + ".RoomOpenWindowCount").val - 1;

        setState(praefix + "WindowsOpen", OpenWindowCount);
        setState(praefix + GetRoom(x) + ".RoomOpenWindowCount", RoomOpenWindowCount[x]);

        //log(GetRoom(x) + " Fenster geschlossen.");
        //WriteEventLog(GetRoom(x) + " Fenster geschlossen!");
        if (RoomOpenWindowCount[x] == 0) {
            if (RepeatInfoMsg == true) {
                setState(praefix + GetRoom(x) + ".IsOpen", false);

                clearInterval(OpenWindowMsgHandler[x]);
            }
            else {
                clearTimeout(OpenWindowMsgHandler[x]);
            };
        };


        if (OpenWindowCount == 0) {
            setState(praefix + "AlleFensterZu", true);
            setState(praefix + GetRoom(x) + ".IsOpen", false);
            log("Alle Fenster geschlossen.");
        };
    };
    //log(OpenWindowCount);
};




function CheckAllWindows() { //Prüft bei Programmstart alle Fenster
    for (let x = 0; x < Sensor.length; x++) { //Alle Sensoren durchlaufen
        if (SensorVal[x] == true || SensorVal[x] == "offen" || SensorVal[x] == "gekippt" || SensorVal[x] == "open" || SensorVal[x] == "tilted") { //Fenster is offen
            OpenWindowCount = OpenWindowCount + 1;
            RoomOpenWindowCount[x] = RoomOpenWindowCount[x] + 1;
            setState(praefix + "AlleFensterZu", false);
            setState(praefix + "WindowsOpen", OpenWindowCount);

            setState(praefix + GetRoom(x) + ".IsOpen", true);
            setState(praefix + GetRoom(x) + ".RoomOpenWindowCount", RoomOpenWindowCount[x]);
            if (InfoMsgAktiv == true) {
                if (RepeatInfoMsg == true) { // Wenn Intervallmeldung eingestellt Interval starten und Dauer bei Ansage aufaddieren
                    OpenWindowMsgHandler[x] = setInterval(function () {
                        Laufzeit[x] = Laufzeit[x] + ZeitBisNachricht;
                        Meldung(GetRoom(x) + "fenster seit " + Laufzeit[x] / 1000 / 60 + " Minuten geöffnet!");
                    }, ZeitBisNachricht);
                }
                else {
                    OpenWindowMsgHandler[x] = setTimeout(function () { // Wenn einmalige Meldung eingestellt
                        Meldung(GetRoom(x) + "fenster seit " + ZeitBisNachricht / 1000 / 60 + " Minuten geöffnet!");
                    }, ZeitBisNachricht);
                };
            };

            //log(GetRoom(x) + " Fenster geöffnet");
            //WriteEventLog(GetRoom(x) + " Fenster geöffnet!");
        }
        else {
            RoomOpenWindowCount[x] = getState(praefix + GetRoom(x) + ".RoomOpenWindowCount").val - 1;
            if (RoomOpenWindowCount[x] < 0) { RoomOpenWindowCount[x] = 0 };
            setState(praefix + GetRoom(x) + ".IsOpen", false);
            setState(praefix + GetRoom(x) + ".RoomOpenWindowCount", RoomOpenWindowCount[x]);

            // log(GetRoom(x) + " Fenster geschlossen.");
            //WriteEventLog(GetRoom(x) + " Fenster geschlossen!");
        };
        //log(OpenWindowCount);
    };

    if (OpenWindowCount == 0) {
        setState(praefix + "AlleFensterZu", true);

        log("Alle Fenster geschlossen.");
    };

};

CheckAllWindows();

//Trigger für Sensoren erzeugen
for (let x = 0; x < Sensor.length; x++) { //Alle Sensoren durchlaufen
    on(Sensor[x], function (dp) { //Trigger in Schleife erstellen
        if (dp.channelId.search(praefix) == -1) { //Ausschliessen dass das Scriptverzeichnis zum Triggern verwendet wird
            SensorVal[x] = getState(Sensor[x]).val;
            CheckWindow(x);
        }
        else {
            log("Fehler, Datenpunkt im Scriptverzeichnis als Trigger definiert", "error");
        };
    });
};

onStop(function () { //Bei Scriptende alle Timer löschen
    for (let x = 1; x < Sensor.length; x++) {
        if (RoomOpenWindowCount[x] == 0) {
            if (RepeatInfoMsg == true) {
                clearInterval(OpenWindowMsgHandler[x]);
            }
            else {
                clearTimeout(OpenWindowMsgHandler[x]);
            };
        };

    };
}, 100);


