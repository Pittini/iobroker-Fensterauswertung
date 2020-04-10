// V1.3.0 vom 10.4.2020
//Script um offene Fenster pro Raum und insgesamt zu zählen. Legt pro Raum zwei Datenpunkte an, sowie zwei Datenpunkte fürs gesamte.
//Möglichkeit eine Ansage nach x Minuten einmalig oder zyklisch bis Fensterschließung anzugeben
//Dynamische erzeugung einer HTML Übersichtstabelle
//WICHTIG!!!
//Vorraussetzungen: Den Geräten müssen Räume zugewiesen sein, sowie die Funktion "Verschluss" für jeden entsprechenden Datenpunkt zugewiesen sein.

//Grundeinstellungen
const logging = false; //Erweiterte Logs ausgeben?
const praefix = "javascript.0.FensterUeberwachung."; //Grundpfad für Script DPs - Muß innerhalb javascript.x sein
const WelcheFunktionVerwenden = "Verschluss"; // Legt fest nach welchem Begriff in Funktionen gesucht wird. Diese Funktion nur dem Datenpunkt zuweisen, NICHT dem ganzen Channel!

const ZeitBisNachricht = 300000 // 300000 ms = 5 Minuten
const OpenMsgAktiv = true; // Legt fest ob eine Infonachricht für offene Fenster nach x Minuten ausgegeben werden soll; Zeitfestlegung erfolgte in Zeile 11
const VentMsgAktiv = true; //Soll Lüftungsempfehlung auch als Nachricht ausgegeben werden (sonst nur in der Tabelle)? 
const AlsoMsgWinOpenClose = false; //Soll auch das erstmalige öffnen, sowie das schliessen gemeldet werden?
const RepeatInfoMsg = true; // Legt fest ob Nachrichten einmalig oder zyklisch ausgegeben werden sollen

const UseTelegram = false; // Sollen Nachrichten via Telegram gesendet werden?
const UseAlexa = false; // Sollen Nachrichten via Alexa ausgegeben werden?
const AlexaId = ""; // Die Alexa Seriennummer.
const UseMail = false; //Nachricht via Mail versenden?
const UseSay = false; // Sollen Nachrichten via Say ausgegeben werden? Autorenfunktion, muß deaktiviert werden.
const UseEventLog = false; // Sollen Nachrichten ins Eventlog geschreiben werden? Autorenfunktion, muß deaktiviert werden.

//Einstellungen zur Tabellenausgabe
const WindowOpenImg = "/icons-mfd-svg/fts_window_1w_open.svg"; //Icon für Fenster offen
const WindowCloseImg = "/icons-mfd-svg/fts_window_1w.svg"; // Icon für Fenster geschlossen
const VentImg = "/icons-mfd-svg/vent_ventilation.svg";
const OpenWindowColor = "indianred"; // Farbe für Fenster offen
const ClosedWindowColor = "limegreen"; // Farbe für Fenster geschlossen
const VentWarnColor = "gold"; // Farbe für Fenster geschlossen

const HeadlessTable = false; // Tabelle mit oder ohne Kopf darstellen
const TableDateFormat = "SS:mm:ss TT.MM.JJJJ"; //Zeit- & Datums- formatierung für Tabelle. Übersicht der Kürzel hier: https://github.com/ioBroker/ioBroker.javascript/blob/master/docs/en/javascript.md#formatdate

//Ab hier nix mehr ändern!
const OpenWindowListSeparator = "<br>"; //Trennzeichen für die Textausgabe der offenen Fenster pro Raum
const WindowIsOpenWhen = ["true", "offen", "gekippt", "open", "tilted", "1", "2"]; // Hier können eigene States für offen angegeben werden, immer !!! in Kleinschreibung
const WindowIsClosedWhen = ["false", "closed", "0"]; // Hier können eigene States für geschlossen angegeben werden, immer !!! in Kleinschreibung
let OpenWindowCount = 0; // Gesamtzahl der geöffneten Fenster
const RoomOpenWindowCount = []; // Array für offene Fenster pro Raum
let RoomsWithOpenWindows = "";
const OpenWindowMsgHandler = []; // Objektarray für timeouts pro Raum
const VentMsgHandler = [];
const VentMsg = [];
const Sensor = []; //Sensoren als Array anlegen
const SensorVal = [];//Sensorwerte als Array anlegen
const SensorOldVal = []; //Alte Sensorwerte als Array ablegen
const Laufzeit = []; //Timer Laufzeit pro Fenster
const RoomList = []; // Raumlisten Array
const VentWarnTime = []; // Array mit Zeiten nach dem eine Lüftungsempfehlung ausgegeben wird
const RoomStateTimeStamp = []; //Letzte Änderung des Raumstatus
const RoomStateTimeCount = []; // Zeitspanne seit letzter Änderung
let z = 0; //Zähler
let DpCount = 0; //Zähler
let IsInit = true // Wird nach initialisierung auf false gesetzt
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
                States[DpCount] = { id: praefix + room + ".RoomOpenWindowCount", initial: 0, forceCreation: false, common: { read: true, write: false, name: "Anzahl der geöffneten Fenster im Raum", role: "state", type: "number", def: 0 } };
                DpCount++;
                States[DpCount] = { id: praefix + room + ".IsOpen", initial: false, forceCreation: false, common: { read: true, write: false, name: "Fenster offen?", type: "boolean", role: "state", def: false } }; //
                DpCount++;
                States[DpCount] = { id: praefix + room + ".VentWarnTime", initial: 0, forceCreation: false, common: { read: true, write: true, name: "Anzahl der Tage nach der eine Lüftungsempfehlung ausgegeben wird", unit: "Tage", type: "number", role: "state", def: 0 } };
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
DpCount++;
States[DpCount] = { id: praefix + "OverviewTable", initial: "", forceCreation: false, common: { read: true, write: true, name: "Übersicht aller Räume und geöffneten Fenster", type: "string", def: "" } };

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


function init() {
    for (let x = 0; x < Sensor.length; x++) { //Sensor Dps einlesen
        //setTimeout(function () { // Timeout setzt refresh status wieder zurück
        SensorVal[x] = String(getState(Sensor[x]).val).toLowerCase(); // Wert von Sensor in Schleife einlesen
        SensorOldVal[x] = "";
        SimplyfyWindowStates(x);
        CheckWindow(x);
        // }, x * 100);
    };

    for (let x = 0; x < RoomList.length; x++) { //Raum Dps einlesen
        //setTimeout(function () { // Timeout setzt refresh status wieder zurück
        VentWarnTime[x] = getState(praefix + RoomList[x] + ".VentWarnTime").val; //Lüftungswarnzeiten einlesen
        VentMsg[x] = ""; // Lüftungsnachricht mit Leerstring initialisieren
        VentCheck(x)
        // }, x * 100);
    };
    IsInit = false;
}

function main() {
    init(); //Bei Scriptstart alle Sensoren und Räume einlesen
    CreateTrigger(); //Trigger erstellen
    CreateRoomsWithOpenWindowsList(); //Übersichtsliste mit Räumen mit offenen Fenstern erstellen
    CreateOverviewTable(); //HTML Tabelle erstellen
    Ticker(); //Minutenticker für Tabellenrefresh starten

}

function Meldung(msg) {
    if (logging) log("Reaching Meldung, msg= " + msg);
    if (UseEventLog) {
        WriteEventLog(msg);
    };
    if (UseSay) Say(msg);
    if (UseTelegram) {
        sendTo("telegram.0", "send", {
            text: msg
        });
    };
    if (UseAlexa) {
        if (AlexaId != "") setState("alexa2.0.Echo-Devices." + AlexaId + ".Commands.announcement"/*announcement*/, msg);
    };
    if (UseMail) {
        sendTo("email", msg);
    };
}

function CreateOverviewTable() { //  Erzeugt tabellarische Übersicht als HTML Tabelle    
    //Tabellenüberschrift und Head
    let OverviewTable = "";
    if (!HeadlessTable) {
        OverviewTable = "<table style='width:100%; border-collapse: collapse; border: 0px solid black;'><caption><div style='height: 20px; text-align:center; padding-top: 10px; padding-bottom: 5px; font-size:1.4em; font-weight: bold;'>Fensterstatus</div></caption>";
        OverviewTable = OverviewTable + "<thead><tr><th width='100%' style='text-align:center; height: 20px; padding-bottom: 5px;'>" + RoomsWithOpenWindows + "</th></tr></thead><tbody></tbody></table>";
    };
    //Tabelle der Raumdetails
    OverviewTable = OverviewTable + "<div style='height: 100%; overflow-y:auto; overflow-x:hidden;'><table style='width:100%; border-collapse: collapse;'>";
    OverviewTable = OverviewTable + "<thead><tr><th width='40px' style='text-align:left;'</th><th width='20px' style='text-align:center;'></th><th style='text-align:left;'></th></tr></thead><tbody>";


    for (let x = 0; x < RoomList.length; x++) { //Alle Räume durchgehen
        //if (logging) log("x=" + x + " room=" + RoomList[x] + " RoomOpenwindowCount=" + RoomOpenWindowCount[x] + " VentMsg=" + VentMsg[x]);
        if (RoomOpenWindowCount[x] > 0) { // Räume mit offenen Fenstern
            //RoomStateTimeStamp[x] = formatDate(getDateObject(getState(praefix + RoomList[x] + ".IsOpen").lc), TableDateFormat);
            RoomStateTimeCount[x] = CalcTimeDiff("now", RoomStateTimeStamp[x]);
            OverviewTable = OverviewTable + "<tr><td style='border: 1px solid black; background-color:" + OpenWindowColor + ";'><img style='filter: invert(1);' height=40px src='" + WindowOpenImg + "'></td>"
            OverviewTable = OverviewTable + "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; font-size:1.1em; font-weight: bold; text-align:center;background-color:" + OpenWindowColor + ";'>" + RoomOpenWindowCount[x] + "</td>"
            OverviewTable = OverviewTable + "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; font-size:1.1em; font-weight: bold; background-color:" + OpenWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:0.8em; font-weight:bold;'>geöffnet:<br> " + CreateTimeString(RoomStateTimeCount[x]) + "</div></td></tr>"
        }
        else { // Geschlossene Räume
            RoomStateTimeCount[x] = CalcTimeDiff("now", RoomStateTimeStamp[x]);
            //log("RSTS=" + RoomStateTimeStamp[x])
            //log("RSTC=" + RoomStateTimeCount[x])
            //log("CTS=" + CreateTimeString(RoomStateTimeCount[x]))
            if (VentMsg[x] == "") {
                OverviewTable = OverviewTable + "<tr><td style='border: 1px solid black; background-color:" + ClosedWindowColor + ";'><img style='filter: invert(1);' height=40px src='" + WindowCloseImg + "'></td>"
                OverviewTable = OverviewTable + "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; font-size:1.1em; font-weight: bold; text-align:center; background-color:" + ClosedWindowColor + ";'>" + RoomOpenWindowCount[x] + "</td>"
                OverviewTable = OverviewTable + "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; font-size:1.1em; font-weight: bold; background-color:" + ClosedWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:0.7em; font-weight:normal;'>geschlossen:<br> " + CreateTimeString(RoomStateTimeCount[x]) + "</div></td></tr>"
            }
            else {
                OverviewTable = OverviewTable + "<tr><td style='border: 1px solid black; background-color:" + VentWarnColor + ";'><img style='filter: invert(1);' height=40px src='" + VentImg + "'></td>"
                OverviewTable = OverviewTable + "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; font-size:1.1em; font-weight: bold; text-align:center; background-color:" + VentWarnColor + ";'>" + RoomOpenWindowCount[x] + "</td>"

                OverviewTable = OverviewTable + "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; font-size:1.1em; font-weight: bold; background-color:" + VentWarnColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:0.8em; font-weight:bold;'> nicht gelüftet:<br>" + CreateTimeString(RoomStateTimeCount[x]) + "</div></td></tr>"
            };

        };
    };
    OverviewTable = OverviewTable + "</tbody></table></div>";
    setState(praefix + "OverviewTable", OverviewTable);
}

function CalcTimeDiff(time1, time2) {
    if (time1 == "now") {
        time1 = new Date().getTime();
    };
    //if (logging) log("CalcTimeDiff result= " + CreateTimeString(time1 - time2));
    return (time1 - time2);
}

function Ticker() {
    setInterval(function () { // Wenn 
        CreateOverviewTable();
    }, 60000);
}

function ReplaceChars(OrigString) {
    let NewString = OrigString.replace("_", " ");
    NewString = NewString.replace("ae", "ä");
    NewString = NewString.replace("ue", "ü");
    NewString = NewString.replace("oe", "ö");
    return NewString;
}

function CreateRoomsWithOpenWindowsList() { //Erzeugt Textliste mit Räumen welche geöffnete Fenster haben
    log("Reaching CreateRoomsWithOpenWindowsList");
    RoomsWithOpenWindows = ""; //Liste Initialisieren
    for (let x = 0; x < RoomList.length; x++) { //Alle Räume durchgehen
        if (RoomOpenWindowCount[x] > 0) { // Nur Räume mit offenen Fenstern berücksichtigen
            if (RoomOpenWindowCount[x] == 1) { //Wenn 1 Fenster offen, Singular Schreibweise
                RoomsWithOpenWindows = RoomsWithOpenWindows + ReplaceChars(RoomList[x]) + " " + RoomOpenWindowCount[x] + " offenes Fenster" + OpenWindowListSeparator;
            }
            else { //ansonsten Plural Schreibweise
                RoomsWithOpenWindows = RoomsWithOpenWindows + ReplaceChars(RoomList[x]) + " " + RoomOpenWindowCount[x] + " offene Fenster" + OpenWindowListSeparator;
            };
        };
    };
    RoomsWithOpenWindows = RoomsWithOpenWindows.substr(0, RoomsWithOpenWindows.length - OpenWindowListSeparator.length); //letzten <br> Umbruch wieder entfernen

    if (RoomsWithOpenWindows == "") {
        RoomsWithOpenWindows = "Alle Fenster sind geschlossen";
    };
    setState(praefix + "RoomsWithOpenWindows", RoomsWithOpenWindows);
    if (logging) log("RoomsWithOpenWindows: " + RoomsWithOpenWindows);
}

function VentCheck(x) {
    if (logging) log("Reaching VentCheck x=" + x+" Init="+IsInit);

    if (RoomOpenWindowCount[x] == 0 && VentWarnTime[x] != 0) { //VentTimeout starten wenn Raum geschlossen und Warnzeit nicht 0 (= deaktiviert) 
        if (logging) log("Starting VentInterval for Room " + RoomList[x] + " Time set to: " + VentWarnTime[x] + " days");
        if (IsInit) { //Bei Skriptstart
            if (CalcTimeDiff("now", RoomStateTimeStamp[x]) >= getDateObject(VentWarnTime[x] * 24 * 60 * 60 * 1000).getTime()) { //Wenn Ventwarnzeit bei Skriptstart schon überschritten, sofortige Meldung
                VentMsg[x] = CreateTimeString(RoomStateTimeCount[x]);
                if (VentMsgAktiv) {
                    Meldung(ReplaceChars(RoomList[x]) + " nicht gelüftet " + VentMsg[x]);
                };
            } else { //Wenn Ventwarnzeit bei Skriptstart noch nicht überschritten, Restzeit berechnen und einmaligen Timeout starten welcher bei Ablauf den regulären Interval startet

                log("Remaining Vent Warn DiffTime at startup= " + CreateTimeString(CalcTimeDiff(VentWarnTime[x] * 24 * 60 * 60 * 1000, RoomStateTimeCount[x])))
                VentMsgHandler[x] = setTimeout(function () {
                    VentMsg[x] = CreateTimeString(RoomStateTimeCount[x]);
                    if (VentMsgAktiv) {
                        Meldung(ReplaceChars(RoomList[x]) + " nicht gelüftet " + VentMsg[x]);
                        CreateOverviewTable();
                    };
                    log("Init Vent Timeout exceeded now calling regular Interval for x=" + x);
                    VentCheck(x);
                }, CalcTimeDiff(VentWarnTime[x] * 24 * 60 * 60 * 1000, RoomStateTimeCount[x]));

            };

        } else {
            VentMsgHandler[x] = setInterval(function () { // Neuen Timeout setzen, volle Warnzeit 
                VentMsg[x] = CreateTimeString(RoomStateTimeCount[x]);
                if (VentMsgAktiv) {
                    Meldung(ReplaceChars(RoomList[x]) + " nicht gelüftet " + VentMsg[x]);
                    CreateOverviewTable();
                };
            }, VentWarnTime[x] * 24 * 60 * 60 * 1000);
        };

        log("VentMsg=" + VentMsg[x]);
    }
    else {
        if (typeof (VentMsgHandler[x]) == "object") { //Wenn ein Interval gesetzt ist, löschen
            log("Clearing Interval for " + x)
            clearInterval(VentMsgHandler[x]); //Beim erstmaligen Fensteröffnen eines Raumes Lüftungstimeout resetten
        };
    };
}


function GetRoom(x) { // Liefert den Raum von Sensor x
    if (logging) log("Reaching GetRoom x=" + x)
    let room = getObject(Sensor[x], 'rooms').enumNames[0];
    if (room == undefined) {
        log("Kein Raum definiert bei Sensor " + Sensor[x], 'error');
        return "Kein Raum definiert";
    };
    if (typeof room == 'object') room = room.de;
    return room;
}

function CheckWindow(x) { //Für einzelnes Fenster. Via Trigger angesteuert.
    let TempRoom = GetRoom(x); //Raum des aktuellen Sensors bestimmen
    let TempRoomIndex = RoomList.indexOf(TempRoom); // Raumlistenindex für aktuellen Raum bestimmen
    if (logging) log("reaching CheckWindow, SensorVal[" + x + "]=" + SensorVal[x] + " SensorOldVal=" + SensorOldVal[x] + " TempRoom=" + TempRoom)

    if (SensorVal[x] == "open" && SensorOldVal[x] != "open") { //Fenster war geschlossen und wurde geöffnet
        if (RoomOpenWindowCount[TempRoomIndex] == 0) setState(praefix + TempRoom + ".IsOpen", true);

        OpenWindowCount++; //Gesamtfensterzähler erhöhen
        RoomOpenWindowCount[TempRoomIndex]++; //Raumfensterzähler erhöhen
        if (logging) log("RoomOpenWindowCount für " + TempRoom + "=" + RoomOpenWindowCount[TempRoomIndex]);
        setState(praefix + TempRoom + ".RoomOpenWindowCount", RoomOpenWindowCount[TempRoomIndex]);

        if (!IsInit) {
            if (RoomOpenWindowCount[TempRoomIndex] == 1) RoomStateTimeStamp[TempRoomIndex] = new Date().getTime(); //Bei Erstöffnung Zeitstempel für Raum setzen

            if (logging) log(TempRoom + " Fenster geöffnet");
            if (AlsoMsgWinOpenClose) Meldung(ReplaceChars(TempRoom) + " Fenster geöffnet!");
            if (UseEventLog == true) WriteEventLog(ReplaceChars(TempRoom) + " Fenster geöffnet!");
        };

        if (RoomOpenWindowCount[TempRoomIndex] == 1) {
            Laufzeit[TempRoomIndex] = 0;
            if (OpenMsgAktiv == true) {
                if (RepeatInfoMsg == true) { // Wenn Intervallmeldung eingestellt Interval starten und Dauer bei Ansage aufaddieren
                    if (logging) log("Setting Interval to Room:" + TempRoom);

                    OpenWindowMsgHandler[TempRoomIndex] = setInterval(function () {
                        Laufzeit[TempRoomIndex] = Laufzeit[TempRoomIndex] + ZeitBisNachricht;
                        //Meldung(TempRoom + "fenster seit " + (Laufzeit[TempRoomIndex] / 1000 / 60).toFixed(0) + " Minuten geöffnet!");
                        Meldung(ReplaceChars(TempRoom) + "fenster seit " + CreateTimeString(CalcTimeDiff("now", RoomStateTimeStamp[TempRoomIndex])) + " geöffnet!");
                    }, ZeitBisNachricht);
                }
                else { // Wenn einmalige Meldung eingestellt
                    if (logging) log("Setting Timeout to Room:" + TempRoom);

                    OpenWindowMsgHandler[TempRoomIndex] = setTimeout(function () {
                        Meldung(ReplaceChars(TempRoom) + "fenster seit " + (ZeitBisNachricht / 1000 / 60).toFixed(0) + " Minuten geöffnet!");
                    }, ZeitBisNachricht);
                };
            };
        };
    }
    else if (SensorVal[x] == "closed") {
        if (!IsInit) { // Wenn nicht in Initialisierungsphase (Skriptstart)

            if (OpenWindowCount > 0) OpenWindowCount--;
            if (RoomOpenWindowCount[TempRoomIndex] > 0) RoomOpenWindowCount[TempRoomIndex]--;
            if (RoomOpenWindowCount[TempRoomIndex] == 0) RoomStateTimeStamp[TempRoomIndex] = new Date().getTime(); //Bei Erstöffnung Zeitstempel für Raum setzen

            log(TempRoom + " Fenster geschlossen.");
            if (AlsoMsgWinOpenClose) Meldung(ReplaceChars(TempRoom) + " Fenster geschlossen!");
            if (UseEventLog == true) WriteEventLog(ReplaceChars(TempRoom) + " Fenster geschlossen!");
        };

        setState(praefix + TempRoom + ".RoomOpenWindowCount", RoomOpenWindowCount[TempRoomIndex]);

        if (RoomOpenWindowCount[TempRoomIndex] == 0) {
            setState(praefix + TempRoom + ".IsOpen", false);

            if (RepeatInfoMsg == true) {
                if (logging) log("reaching clearInterval - [x] = " + [x] + " TempRoomIndex= " + TempRoomIndex);
                if (typeof (OpenWindowMsgHandler[TempRoomIndex]) == "object") { //Wenn ein Interval gesetzt ist, löschen
                    log("Clearing Interval for " + x)
                    clearInterval(OpenWindowMsgHandler[TempRoomIndex]); //Beim erstmaligen Fensteröffnen eines Raumes Lüftungstimeout resetten
                };
            }
            else {
                if (logging) log("reaching clearTimeout");
                clearTimeout(OpenWindowMsgHandler[TempRoomIndex]);
            };
        };

    };

    if (OpenWindowCount == 0) { //Wenn kein Fenster mehr offen Datenpunkte aktualisieren
        setState(praefix + "WindowsOpen", OpenWindowCount);
        setState(praefix + "AlleFensterZu", true);
        log("Alle Fenster geschlossen.");
    }
    else { //ansonsten ebenfalls Datenpunkte (mit anderen Werten) aktualisieren
        setState(praefix + "WindowsOpen", OpenWindowCount);
        setState(praefix + "AlleFensterZu", false);
    };

    if (logging) log("Offene Fenster gesamt= " + OpenWindowCount);

    if (IsInit) { // Wenn in Initialisierungsphase (Skriptstart)
        RoomStateTimeStamp[TempRoomIndex] = getState(praefix + RoomList[TempRoomIndex] + ".IsOpen").lc;
    } else {
        //if (RoomOpenWindowCount[TempRoomIndex] == 1) RoomStateTimeStamp[TempRoomIndex] = new Date().getTime(); //Bei Erstöffnung Zeitstempel für Raum setzen
        log("RoomStateTimeStamp= " + RoomStateTimeStamp[TempRoomIndex]);
    };

    RoomStateTimeCount[TempRoomIndex] = CalcTimeDiff("now", RoomStateTimeStamp[TempRoomIndex]);
}

function SimplyfyWindowStates(x) { //Die verschiedenen Gerätestates zu open oder close vereinfachen
    //log("Sensor "+Sensor[x]+" mit Wert "+ SensorVal[x]+ " hat Typ " + typeof(SensorVal[x] ));
    if (WindowIsOpenWhen.indexOf(SensorVal[x]) != -1) { // Suche in Fensteroffenarray, wenn gefunden, Status auf open setzen
        SensorVal[x] = "open";
    }
    else if (WindowIsClosedWhen.indexOf(SensorVal[x]) != -1) { // Suche in Fenstergeschlossenarray, wenn gefunden, Status auf closed setzen
        SensorVal[x] = "closed";
    };

    if (SensorVal[x] != "open" && SensorVal[x] != "closed") { // Suche in Fensteroffenarray und Fenstergeschlossenarray, wenn nirgends gefunden, Status auf closed setzen und Logwarnung ausgeben
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

function CreateTimeString(mstime) {
    let TimeString;
    let days = Math.floor(mstime / (1000 * 60 * 60 * 24));
    mstime = mstime % (1000 * 60 * 60 * 24);

    let hours = Math.floor(mstime / (1000 * 60 * 60));
    mstime = mstime % (1000 * 60 * 60);

    let mins = Math.floor(mstime / (1000 * 60));
    mstime = mstime % (1000 * 60);

    let seks = Math.floor(mstime / 1000);

    if (days > 0) {
        if (days == 1) { //Singular
            TimeString = days + " Tag ";
        } else { //Plural
            TimeString = days + " Tage ";
        };
    } else {
        TimeString = "";
    };

    if (hours > 0) {
        if (hours == 1) { //Singular
            TimeString = TimeString + hours + " Stunde ";
        } else { //Plural
            TimeString = TimeString + hours + " Stunden ";
        };
    } else {
        TimeString = TimeString + "";
    };

    if (mins > 0) {
        if (mins == 1) { //Singular
            TimeString = TimeString + mins + " Minute ";
        } else { //Plural
            TimeString = TimeString + mins + " Minuten ";
        };
    } else {
        TimeString = TimeString + "";
    };
    /*
        if (seks > 0) {
            if (seks == 1) { //Singular
                TimeString = TimeString + seks + " Sekunde ";
            } else { //Plural
                TimeString = TimeString + seks + " Sekunden ";
            };
        } else {
            TimeString = TimeString + "";
        };
        //if (logging) log(TimeString);
    */
    if (TimeString == "") TimeString = "gerade eben"
    return TimeString.trim();

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
                CreateRoomsWithOpenWindowsList();
                CreateOverviewTable();
            }
            else {
                log("Fehler, Datenpunkt im Scriptverzeichnis als Trigger definiert", "error");
            };
        });
    };

    //Trigger für Räume erzeugen
    for (let x = 0; x < RoomList.length; x++) { //Alle Räume durchlaufen
        on(praefix + RoomList[x] + ".VentWarnTime", function (dp) { //Trigger in Schleife erstellen
            if (logging) log("Raum= " + RoomList[x] + " VentWarnTime= " + dp.state.val + " Alter Wert= " + dp.oldState.val);
            VentWarnTime[x] = dp.state.val;
            IsInit = true
            VentMsg[x] = "";
            VentCheck(x);
            IsInit = false
            CreateOverviewTable();
        });
    };



    onStop(function () { //Bei Scriptende alle Timer löschen
        for (let x = 1; x < Sensor.length; x++) {

            if (typeof (VentMsgHandler[x]) == "object") { //Wenn ein Interval gesetzt ist, löschen
                log("Clearing Interval for " + x)
                clearInterval(VentMsgHandler[x]);
            };

            if (RepeatInfoMsg == true) {
                if (typeof (OpenWindowMsgHandler[x]) == "object") { //Wenn ein Interval gesetzt ist, löschen
                    log("Clearing Interval for " + x)
                    clearInterval(OpenWindowMsgHandler[x]); //
                };

            }
            else {
                if (typeof (OpenWindowMsgHandler[x]) == "object") { //Wenn ein Interval gesetzt ist, löschen
                    log("Clearing Timeout for " + x)
                    clearTimeout(OpenWindowMsgHandler[x]);
                };

            };

        };
    }, 100);
}
