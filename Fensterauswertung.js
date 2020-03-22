// V1.1.51 vom 22.3.2020
//Script um offene Fenster pro Raum und insgesamt zu zählen. Legt pro Raum zwei Datenpunkte an, sowie zwei Datenpunkte fürs gesamte.
//Möglichkeit eine Ansage nach x Minuten einmalig oder zyklisch bis Fensterschließung anzugeben

//WICHTIG!!!
//Vorraussetzungen: Den Geräten müssen Räume zugewiesen sein, sowie die Funktion "Verschluss" für jeden entsprechenden Datenpunkt zugewiesen sein.
const logging = true;
const praefix = "javascript.0.FensterUeberwachung."; //Grundpfad für Script DPs
const ZeitBisNachricht = 300000 // 300000 ms = 5 Minuten
const RepeatInfoMsg = true; // Legt fest ob Ansage einmalig oder zyklisch
const InfoMsgAktiv = true; // Legt fest ob eine Infonachricht nach x Minuten ausgegeben werden soll
const WelcheFunktionVerwenden = "Verschluss"; // Legt fest nach welchem Begriff in Funktionen gesucht wird.
const UseTelegram = false; // Sollen Nachrichten via Telegram gesendet werden?
const UseAlexa = false; // Sollen Nachrichten via Alexa ausgegeben werden?
const AlexaId = ""; // Die Alexa Seriennummer
const UseSay = true; // Sollen Nachrichten via Say ausgegeben werden?
const UseEventLog = true; // Sollen Nachrichten ins Eventlog geschreiben werden?

//Ab hier nix mehr ändern


function Meldung(msg) {
    if (UseSay) Say(msg);
    if (UseTelegram) {
        sendTo("telegram.0", "send", {
            text: msg
        });
    };
    if (UseAlexa) {
        if (AlexaId != "") setState("alexa2.0.Echo-Devices." + AlexaId + ".Commands.announcement"/*announcement*/, msg);
    };
    if (logging) log(msg);
};


let OpenWindowCount = 0; // Gesamtzahl der geöffneten Fenster
let RoomOpenWindowCount = []; // Array für offene Fenster pro Raum
let OpenWindowMsgHandler = []; // Objektarray für timeouts pro Raum
let Sensor = []; //Sensoren als Array anlegen
let SensorVal = [];//Sensorwerte als Array anlegen
let SensorOldVal = []; //Alte Sensorwerte als Array ablegen

let Laufzeit = []; //Timer Laufzeit pro Fenster
let RoomList = [];
let z = 0;
let DpCount = 0;
let States = [];

let Funktionen = getEnums('functions');
for (let x in Funktionen) {        // loop ueber alle Functions
    let Funktion = Funktionen[x].name;

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
                //Datenpunkte pro Raum vorbereiten
                States[DpCount] = { id: praefix + room + ".RoomOpenWindowCount", initial: 0, forceCreation: false, common: { read: true, write: true, name: "Anzahl der geöffneten Fenster im Raum", type: "number", def: 0 } };
                DpCount++;
                States[DpCount] = { id: praefix + room + ".IsOpen", initial: false, forceCreation: false, common: { read: true, write: true, name: "Fenster offen?", type: "boolean", role: "state", def: false } }; //
                DpCount++;
                //log(Funktion + ': ' + room);
                if (RoomList.indexOf(room) == -1) { //Raumliste ohne Raumduplikate erzeugen
                    RoomList[z] = room
                    if (logging) log(RoomList[z])
                    z++
                };
                RoomOpenWindowCount[y] = 0; // Array mit 0 initialisieren
                Laufzeit[y] = 0; // Array mit 0 initialisieren
            };
        };
    };
};

//Struktur anlegen in js.0 um Sollwert und Summenergebniss zu speichern
//Generische Datenpunkte vorbereiten 
States[DpCount] = { id: praefix + "AlleFensterZu", initial: true, forceCreation: false, common: { read: true, write: true, name: "Fenster zu?", type: "boolean", role: "state", def: true } }; //
DpCount++;
States[DpCount] = { id: praefix + "WindowsOpen", initial: 0, forceCreation: false, common: { read: true, write: true, name: "Anzahl der geöffneten Fenster", type: "number", def: 0 } };

//Alle States anlegen, Main aufrufen wenn fertig
let numStates = States.length;
States.forEach(function (state) {
    createState(state.id, state.initial, state.forceCreation, state.common, function () {
        numStates--;
        if (numStates === 0) {
            if (logging) log("CreateStates fertig!");
            main();
        };
    });
});

function main() {
    for (let x = 0; x < Sensor.length; x++) {
        SensorVal[x] = getState(Sensor[x]).val; // Wert von Sensor in Schleife einlesen
        //log(SensorVal[x]);
    };

    CreateTrigger();
    CheckAllWindows(); //Bei Scriptstart alle Fenster einlesen

};



function GetRoom(x) { // Liefert den Raum von Sensor x
    if (logging) log("Reaching GetRoom x=" + x)
    let room = getObject(Sensor[x], 'rooms').enumNames[0];
    if (room == undefined) {
        log("Kein Raum definiert", 'error');
        return "Kein Raum definiert";
    };
    if (typeof room == 'object') room = room.de;
    return room;
};

function CheckWindow(x) { //Für einzelnes Fenster. Via Trigger angesteuert.
    let TempRoom = GetRoom(x); //Raum des aktuellen Sensors bestimmen
    let TempRoomIndex = RoomList.indexOf(TempRoom); // Raumlistenindex für aktuellen Raum bestimmen
    //log(getObject(SensorPraefix+Sensor[x], 'rooms').enumNames.join(', '));
    if (logging) log("reaching CheckWindow, SensorVal[" + x + "]=" + SensorVal[x] + " TempRoom=" + TempRoom)
    if ((SensorVal[x] == true || SensorVal[x] == "offen" || SensorVal[x] == "gekippt" || SensorVal[x] == "open" || SensorVal[x] == "tilted") && (SensorOldVal[x] != true || SensorOldVal[x] != "offen" || SensorOldVal[x] != "gekippt" || SensorOldVal[x] != "open" || SensorOldVal[x] != "tilted")) { //Fenster is offen
        OpenWindowCount++;
        //RoomOpenWindowCount[TempRoomIndex] = getState(praefix + TempRoom + ".RoomOpenWindowCount").val + 1;
        RoomOpenWindowCount[TempRoomIndex]++;

        if (logging) log("RoomOpenWindowCount für " + TempRoom + "=" + RoomOpenWindowCount[TempRoomIndex])
        setState(praefix + "AlleFensterZu", false);
        setState(praefix + TempRoom + ".IsOpen", true);
        setState(praefix + "WindowsOpen", OpenWindowCount);
        setState(praefix + TempRoom + ".RoomOpenWindowCount", RoomOpenWindowCount[TempRoomIndex]);

        if (logging) log(TempRoom + " Fenster geöffnet");
        if (UseEventLog == true) WriteEventLog(TempRoom + " Fenster geöffnet!");
        if (RoomOpenWindowCount[TempRoomIndex] == 1) {
            Laufzeit[TempRoomIndex] = 0;
            if (InfoMsgAktiv == true) {
                if (RepeatInfoMsg == true) { // Wenn Intervallmeldung eingestellt Interval starten und Dauer bei Ansage aufaddieren
                    if (logging) log("Setting Interval to Room:" + TempRoom);

                    OpenWindowMsgHandler[TempRoomIndex] = setInterval(function () {
                        Laufzeit[TempRoomIndex] = Laufzeit[TempRoomIndex] + ZeitBisNachricht;
                        Meldung(TempRoom + "fenster seit " + Laufzeit[TempRoomIndex] / 1000 / 60 + " Minuten geöffnet!");
                    }, ZeitBisNachricht);
                }
                else { // Wenn einmalige Meldung eingestellt
                    if (logging) log("Setting Timeout to Room:" + TempRoom);

                    OpenWindowMsgHandler[TempRoomIndex] = setTimeout(function () {
                        Meldung(TempRoom + "fenster seit " + ZeitBisNachricht / 1000 / 60 + " Minuten geöffnet!");
                    }, ZeitBisNachricht);
                };
            };
        };
    }
    else {
        OpenWindowCount--;
        //RoomOpenWindowCount[TempRoomIndex] = getState(praefix + TempRoom + ".RoomOpenWindowCount").val - 1;
        RoomOpenWindowCount[TempRoomIndex]--;

        setState(praefix + "WindowsOpen", OpenWindowCount);
        setState(praefix + TempRoom + ".RoomOpenWindowCount", RoomOpenWindowCount[TempRoomIndex]);

        log(TempRoom + " Fenster geschlossen.");
        if (UseEventLog == true) WriteEventLog(TempRoom + " Fenster geschlossen!");
        if (RoomOpenWindowCount[TempRoomIndex] == 0) {
            setState(praefix + TempRoom + ".IsOpen", false);

            if (RepeatInfoMsg == true) {
                if (logging) log("reaching clearInterval - [x] = " + [x] + " TempRoomIndex= " + TempRoomIndex);
                clearInterval(OpenWindowMsgHandler[TempRoomIndex]);
            }
            else {
                if (logging) log("reaching clearTimeout");
                clearTimeout(OpenWindowMsgHandler[TempRoomIndex]);
            };
        };


        if (OpenWindowCount == 0) {
            setState(praefix + "AlleFensterZu", true);
            setState(praefix + TempRoom + ".IsOpen", false);
            log("Alle Fenster geschlossen.");
        };
    };
    if (logging) log("Offene Fenster gesamt= "+OpenWindowCount);
};




function CheckAllWindows() { //Prüft bei Programmstart alle Fenster
    for (let x = 0; x < Sensor.length; x++) { //Alle Sensoren durchlaufen
        let TempRoom = GetRoom(x);
        let TempRoomIndex = RoomList.indexOf(TempRoom);
        //if (logging) log(TempRoom);
        if (SensorVal[x] == true || SensorVal[x] == "offen" || SensorVal[x] == "gekippt" || SensorVal[x] == "open" || SensorVal[x] == "tilted") { //Fenster is offen
            OpenWindowCount = OpenWindowCount + 1;
            //RoomOpenWindowCount[RoomList.indexOf(TempRoom)] = RoomOpenWindowCount[TempRoomIndex] + 1;
            RoomOpenWindowCount[TempRoomIndex] = RoomOpenWindowCount[TempRoomIndex] + 1;
            log("Temproom= " + TempRoom + " TempRoomIndex= " + RoomList.indexOf(TempRoom) + "  RoomOpenWindowcount= " + RoomOpenWindowCount[TempRoomIndex]);

            setState(praefix + "AlleFensterZu", false);
            setState(praefix + "WindowsOpen", OpenWindowCount);

            setState(praefix + TempRoom + ".IsOpen", true);
            setState(praefix + TempRoom + ".RoomOpenWindowCount", RoomOpenWindowCount[TempRoomIndex]);
            if (InfoMsgAktiv == true && RoomOpenWindowCount[RoomList.indexOf(TempRoom)] == 1) {
                if (RepeatInfoMsg == true) { // Wenn Intervallmeldung eingestellt Interval starten und Dauer bei Ansage aufaddieren
                    if (logging) log("Setting Interval at initialization to Room: " + TempRoom);
                    OpenWindowMsgHandler[TempRoomIndex] = setInterval(function () {
                        Laufzeit[TempRoomIndex] = Laufzeit[TempRoomIndex] + ZeitBisNachricht;
                        Meldung(TempRoom + "fenster seit " + Laufzeit[TempRoomIndex] / 1000 / 60 + " Minuten geöffnet!");
                    }, ZeitBisNachricht);
                }
                else {
                    if (logging) log("Setting Timeout at initialization to Room: " + TempRoom);

                    OpenWindowMsgHandler[TempRoomIndex] = setTimeout(function () { // Wenn einmalige Meldung eingestellt
                        Meldung(TempRoom + "fenster seit " + ZeitBisNachricht / 1000 / 60 + " Minuten geöffnet!");
                    }, ZeitBisNachricht);
                };
            };

            log(TempRoom + " Fenster = geöffnet");
            //WriteEventLog(GetRoom(x) + " Fenster geöffnet!");
        }
        else {
            //RoomOpenWindowCount[TempRoomIndex] = getState(praefix + TempRoom + ".RoomOpenWindowCount").val - 1;
            //RoomOpenWindowCount[TempRoomIndex] = RoomOpenWindowCount[TempRoomIndex]-1
            //if (RoomOpenWindowCount[TempRoomIndex] < 0) RoomOpenWindowCount[TempRoomIndex] = 0;
            //setState(praefix + TempRoom + ".IsOpen", false);
            //setState(praefix + TempRoom + ".RoomOpenWindowCount", RoomOpenWindowCount[TempRoomIndex]);

            log(TempRoom + " Fenster = geschlossen.");
            //WriteEventLog(GetRoom(x) + " Fenster geschlossen!");
        };
        //log(OpenWindowCount);
    };

    if (OpenWindowCount == 0) {
        setState(praefix + "AlleFensterZu", true);

        log("Alle Fenster geschlossen.");
    };

};

function CreateTrigger() {
    //Trigger für Sensoren erzeugen
    for (let x = 0; x < Sensor.length; x++) { //Alle Sensoren durchlaufen
        on(Sensor[x], function (dp) { //Trigger in Schleife erstellen
            if (logging) log("Trigger= " + x + " Wert=" + dp.state.val + " Alter Wert= " + dp.oldState.val);
            if (dp.channelId.search(praefix) == -1) { //Ausschliessen dass das Scriptverzeichnis zum Triggern verwendet wird
                SensorVal[x] = dp.state.val;
                SensorOldVal[x] = dp.oldState.val;
                //SensorVal[x] = getState(Sensor[x]).val;
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

};
