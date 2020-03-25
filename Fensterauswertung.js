// V1.1.8 vom 25.3.2020
//Script um offene Fenster pro Raum und insgesamt zu zählen. Legt pro Raum zwei Datenpunkte an, sowie zwei Datenpunkte fürs gesamte.
//Möglichkeit eine Ansage nach x Minuten einmalig oder zyklisch bis Fensterschließung anzugeben

//WICHTIG!!!
//Vorraussetzungen: Den Geräten müssen Räume zugewiesen sein, sowie die Funktion "Verschluss" für jeden entsprechenden Datenpunkt zugewiesen sein.

const logging = true; //Erweiterte Logs ausgeben?
const praefix = "javascript.0.FensterUeberwachung."; //Grundpfad für Script DPs
const ZeitBisNachricht = 300000 // 300000 ms = 5 Minuten
const RepeatInfoMsg = true; // Legt fest ob Ansage einmalig oder zyklisch
const InfoMsgAktiv = true; // Legt fest ob eine Infonachricht nach x Minuten ausgegeben werden soll
const WelcheFunktionVerwenden = "Verschluss"; // Legt fest nach welchem Begriff in Funktionen gesucht wird.
const UseTelegram = false; // Sollen Nachrichten via Telegram gesendet werden?
const UseAlexa = false; // Sollen Nachrichten via Alexa ausgegeben werden?
const AlexaId = ""; // Die Alexa Seriennummer
const UseSay = true; // Sollen Nachrichten via Say ausgegeben werden? Authorenfunktion, sollte deaktiviert werden.
const UseEventLog = true; // Sollen Nachrichten ins Eventlog geschreiben werden? Authorenfunktion, sollte deaktiviert werden.
const OpenWindowListSeparator = "<br>"; //Trennzeichen für die Textausgabe der offenen Fenster pro Raum
const WindowIsOpenWhen = ["true", "offen", "gekippt", "open", "tilted", "1", "2"]; // Hier können eigene States für offen angegeben werden, immer !!! in Kleinschreibung
const WindowIsClosedWhen = ["false", "closed", "0"]; // können eigene States für geschlossen angegeben werden, immer !!! in Kleinschreibung

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
const RoomOpenWindowCount = []; // Array für offene Fenster pro Raum
let RoomsWithOpenWindows = "";
const OpenWindowMsgHandler = []; // Objektarray für timeouts pro Raum
const Sensor = []; //Sensoren als Array anlegen
const SensorVal = [];//Sensorwerte als Array anlegen
const SensorOldVal = []; //Alte Sensorwerte als Array ablegen
const Laufzeit = []; //Timer Laufzeit pro Fenster
const RoomList = []; // Raumlisten Array
let z = 0; //Zähler
let DpCount = 0; //Zähler
const States = []; // Array mit anzulegenden Datenpunkten
let Funktionen = getEnums('functions');

for (let x in Funktionen) {        // loop ueber alle Functions
    let Funktion = Funktionen[x].name;
    if (Funktion == undefined) {
        log("Keine Funktion gefunden");
    }
    else {
        if (typeof Funktion == 'object') Funktion = Funktion.de;
        let members = Funktionen[x].members;
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
                    RoomList[z] = room;
                    if (logging) log("Raum " + z + " = " + RoomList[z]);
                    z++;
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
DpCount++;
States[DpCount] = { id: praefix + "RoomsWithOpenWindows", initial: "Fenster in allen Räumen geschlossen", forceCreation: false, common: { read: true, write: true, name: "In welchen Räumen sind Fenster geöffnet?", type: "string", def: "Fenster in allen Räumen geschlossen" } };

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
        //setTimeout(function () { // Timeout setzt refresh status wieder zurück
        SensorVal[x] = String(getState(Sensor[x]).val).toLowerCase(); // Wert von Sensor in Schleife einlesen
        SimplyfyWindowStates(x);
        // }, x * 100);
    };
    CreateTrigger();
    //CheckAllWindows(); //Bei Scriptstart alle Fenster einlesen
};

function CreateRoomsWithOpenWindowsList() { //Erzeugt Textliste mit Räumen welche geöffnete Fenster haben
    RoomsWithOpenWindows = ""; //Liste Initialisieren
    for (let x = 0; x < RoomList.length; x++) { //Alle Räume durchgehen
        if (RoomOpenWindowCount[x] > 0) { // Nur Räume mit offenen Fenstern berücksichtigen
            if (RoomOpenWindowCount[x] == 1) { //Wenn 1 Fenster offen, Singular Schreibweise
                RoomsWithOpenWindows = RoomsWithOpenWindows + RoomList[x] + " " + RoomOpenWindowCount[x] + " offenes Fenster" + OpenWindowListSeparator;
            }
            else { //ansonsten Plural Schreibweise
                RoomsWithOpenWindows = RoomsWithOpenWindows + RoomList[x] + " " + RoomOpenWindowCount[x] + " offene Fenster" + OpenWindowListSeparator;
            };
        };
    };
    RoomsWithOpenWindows = RoomsWithOpenWindows.substr(0, RoomsWithOpenWindows.length - OpenWindowListSeparator.length); //letzten <br> Umbruch wieder entfernen

    if (RoomsWithOpenWindows == "") {
        RoomsWithOpenWindows = "Alle Fenster sind geschlossen";
    };
    setState(praefix + "RoomsWithOpenWindows", RoomsWithOpenWindows);
    if (logging) log(RoomsWithOpenWindows);
}

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
    if (logging) log("reaching CheckWindow, SensorVal[" + x + "]=" + SensorVal[x] + " SensorOldVal=" + SensorOldVal[x] + " TempRoom=" + TempRoom)
    if (SensorVal[x] == "open" && SensorOldVal[x] != "open") { //Fenster war geschlossen und wurde geöffnet
        OpenWindowCount++;
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
    else if (SensorVal[x] == "closed") {
        if (OpenWindowCount > 0) OpenWindowCount--;
        if (RoomOpenWindowCount[TempRoomIndex] > 0) RoomOpenWindowCount[TempRoomIndex]--;

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
    if (logging) log("Offene Fenster gesamt= " + OpenWindowCount);
    CreateRoomsWithOpenWindowsList();
};

function CheckAllWindows() { //Prüft bei Programmstart alle Fenster
    for (let x = 0; x < Sensor.length; x++) { //Alle Sensoren durchlaufen
        let TempRoom = GetRoom(x);
        let TempRoomIndex = RoomList.indexOf(TempRoom);
        //if (logging) log(TempRoom);
        if (SensorVal[x] == "open") { //Fenster is offen
            OpenWindowCount = OpenWindowCount + 1;
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
            if (logging) log(TempRoom + " Fenster = geöffnet");
        }
        else if (SensorVal[x] == "closed") {
            //RoomOpenWindowCount[TempRoomIndex] = getState(praefix + TempRoom + ".RoomOpenWindowCount").val - 1;
            RoomOpenWindowCount[TempRoomIndex]--;
            if (RoomOpenWindowCount[TempRoomIndex] < 0) RoomOpenWindowCount[TempRoomIndex] = 0;
            setState(praefix + TempRoom + ".IsOpen", false);
            setState(praefix + TempRoom + ".RoomOpenWindowCount", RoomOpenWindowCount[TempRoomIndex]);
            //log(TempRoom + " Fenster = geschlossen.");
        };
    };
    if (OpenWindowCount == 0) {
        setState(praefix + "AlleFensterZu", true);
        setState(praefix + "WindowsOpen", OpenWindowCount);

        log("Alle Fenster geschlossen.");
    };
    CreateRoomsWithOpenWindowsList();
};

function SimplyfyWindowStates(x) { //Die verschiedenen Gerätestates zu open oder close vereinfachen
    //log("Sensor "+Sensor[x]+" mit Wert "+ SensorVal[x]+ " hat Typ " + typeof(SensorVal[x] ));
    if (WindowIsOpenWhen.indexOf(SensorVal[x]) != -1) { // Suche in Fensteroffenarray, wenn gefunden, Status auf open setzen
        SensorVal[x] = "open";
    }
    else if (WindowIsClosedWhen.indexOf(SensorVal[x]) != -1) { // Suche in Fenstergeschlossenarray, wenn gefunden, Status auf closed setzen
        SensorVal[x] = "closed";
    };

    if (SensorVal[x] != "open" && SensorVal[x] != "closed") {
        // Suche in Fensteroffenarray und Fenstergeschlossenarray, wenn nirgends gefunden, Status auf closed setzen und Logwarnung ausgeben
        log("Unknown Windowstate " + SensorVal[x] + " detected at " + Sensor[x] + ", please check your configuration", "warn");
        SensorVal[x] = "unknown";
    };

    if (WindowIsOpenWhen.indexOf(SensorOldVal[x]) != -1) {
        SensorOldVal[x] = "open";
    }
    else if (WindowIsClosedWhen.indexOf(SensorOldVal[x]) != -1) {
        SensorOldVal[x] = "closed";
    };
}

function CreateTrigger() {
    //Trigger für Sensoren erzeugen
    for (let x = 0; x < Sensor.length; x++) { //Alle Sensoren durchlaufen
        on(Sensor[x], function (dp) { //Trigger in Schleife erstellen
            if (logging) log("Trigger= " + x + " Wert= " + dp.state.val + " Alter Wert= " + dp.oldState.val);
            if (dp.channelId.search(praefix) == -1) { //Ausschliessen dass das Scriptverzeichnis zum Triggern verwendet wird
                SensorVal[x] = String(dp.state.val).toLowerCase(); // Alles in String und Kleinschreibweise wandeln
                SensorOldVal[x] = String(dp.oldState.val).toLowerCase(); // Alles in String und Kleinschreibweise wandeln
                SimplyfyWindowStates(x);
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
