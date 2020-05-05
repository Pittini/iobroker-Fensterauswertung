// V1.5.3 vom 3.5.2020 - https://github.com/Pittini/iobroker-Fensterauswertung - https://forum.iobroker.net/topic/31674/vorlage-generisches-fensteroffenskript-vis
//Script um offene Fenster pro Raum und insgesamt zu zählen. Legt pro Raum zwei Datenpunkte an, sowie zwei Datenpunkte fürs gesamte.
//Möglichkeit eine Ansage nach x Minuten einmalig oder zyklisch bis Fensterschließung anzugeben
//Dynamische erzeugung einer HTML Übersichtstabelle
//WICHTIG!!!
//Vorraussetzungen: Den Geräten müssen Räume zugewiesen sein, sowie die Funktion "Verschluss" für jeden entsprechenden Datenpunkt zugewiesen sein.

//Grundeinstellungen
const logging = true; //Erweiterte Logs ausgeben?
const praefix = "javascript.0.FensterUeberwachung."; //Grundpfad für Script DPs - Muß innerhalb javascript.x sein.
const WelcheFunktionVerwenden = "Verschluss"; // Legt fest nach welchem Begriff in Funktionen gesucht wird. Diese Funktion nur dem Datenpunkt zuweisen, NICHT dem ganzen Channel!
const IgnoreTime = 10000; // 10000 ms = 10 Sekunden - Zeit in ms für die kurzzeitiges öffnen/schliessen ignoriert wird

//Nachrichteneinstellungen
const ZeitBisNachricht = 900000 // 300000 ms = 5 Minuten - Zyklus- bzw. Ablaufzeit für Fensteroffenwarnung/en
const MaxMessages = 3; //Maximale Anzahl der Nachrichten pro Raum 

const UseTelegram = false; // Sollen Nachrichten via Telegram gesendet werden?
const UseAlexa = false; // Sollen Nachrichten via Alexa ausgegeben werden?
const AlexaId = ""; // Die Alexa Seriennummer.
const UseMail = false; //Nachricht via Mail versenden?
const UseSay = true; // Sollen Nachrichten via Say ausgegeben werden? Autorenfunktion, muß deaktiviert werden.
const UseEventLog = false; // Sollen Nachrichten ins Eventlog geschreiben werden? Autorenfunktion, muß deaktiviert werden.

//Tabelleneinstellungen
const WindowOpenImg = "/icons-mfd-svg/fts_window_1w_open.svg"; //Icon für Fenster offen
const WindowCloseImg = "/icons-mfd-svg/fts_window_1w.svg"; // Icon für Fenster geschlossen
const WindowTiltedImg = "/icons-mfd-svg/fts_window_1w_tilt.svg" //Icon für Fenster gekippt
const WindowOpenTiltedImg = "/icons-mfd-svg/fts_window_2w_open_l_tilt_r.svg" //Icon für offen und gekippt in einem Raum gleichzeitig
const VentImg = "/icons-mfd-svg/vent_ventilation.svg"; //Icon für Lüftungsinfo
const ImgInvert = 1; // Bildfarben invertieren? Erlaubte Werte von 0 bis 1
const OpenWindowColor = "#f44336"; // Farbe für Fenster offen
const TiltedWindowColor = "#F56C62"; //Farbe für gekippte Fenster
const ClosedWindowColor = "#4caf50"; // Farbe für geschlossene Fenster 
const VentWarnColor = "#ffc107"; // Farbe für Lüftungswarnung
const ShowCaptionTbl = false; // Überschrift anzeigen?
const ShowSummaryTbl = true; // Zusammenfassung anzeigen?
const ShowDetailTbl = true; // Details anzeigen?

//Logeinstellungen
const MaxLogEntrys = 20; //Maximale Anzahl der zu speichernden Logeinträge
const AutoAddTimestamp = true; //Soll den geloggten Nachrichten automatisch ein Zeitsempel zugeordnet werden?
const LogTimeStampFormat = "TT.MM.JJJJ SS:mm:ss"; //Zeitformatierung für Log Zeitstempel
const LogEntrySeparator = "<br>"; //Trennzeichen für Logeinträge

//Ab hier nix mehr ändern!
const SendVentMsg = [];
const SendOpenCloseMsg = [];
const SendWarnMsg = [];

const OpenWindowListSeparator = "<br>"; //Trennzeichen für die Textausgabe der offenen Fenster pro Raum

const WindowIsOpenWhen = ["true", "offen", "open", "opened", "2"]; // Hier können eigene States für offen angegeben werden, immer !!! in Kleinschreibung
const WindowIsClosedWhen = ["false", "geschlossen", "closed", "0"]; // Hier können eigene States für geschlossen angegeben werden, immer !!! in Kleinschreibung
const WindowIsTiltedWhen = ["tilted", "gekippt", "1"]; // Hier können eigene States für gekippt angegeben werden, immer !!! in Kleinschreibung

let OpenWindowCount = 0; // Gesamtzahl der geöffneten Fenster
let TiltedWindowCount = 0; // Davon Anzahl der gekippten Fenster

const RoomOpenWindowCount = []; // Array für Zähler offene Fenster pro Raum
const RoomTiltedWindowCount = []; // Array für Zähler gekippte Fenster pro Raum
const RoomMsgCount = []; //Zähler für bereits ausgegebene Warnmeldungen

let RoomsWithOpenWindows = ""; //Liste der offenen Räume
let RoomsWithTiltedWindows = ""; //Liste der Räume mit gekippten Fenstern
let RoomsWithVentWarnings = []; //Räume mit Lüftungswarnung

const OpenWindowMsgHandler = []; // Objektarray für timeouts pro Raum
const IgnoreValue = []; //Vergleichswert für IgnoreTimeout
const VentMsgHandler = []; //Timeout/Intervall Objekt
const VentMsg = []; //Lüftungsnachricht
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
let IsInit = true // Marker - Wird nach initialisierung auf false gesetzt
const States = []; // Array mit anzulegenden Datenpunkten
let Funktionen = getEnums('functions'); //Array mit Aufzählung der Funktionen
let MessageLog = ""; //Log der ausgegebenen Meldungen
let MuteMode = 0; //Stummschaltungsmodus für Nachrichten. 0=Alles erlaubt, 1=Sprachnachrichten deaktivieren, 2=Alles deaktivieren
const IgnoreInProcess = []; //Läuft gerade eine Überprüfung ob eine Statusänderung ignoriert werden muß?

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
                States[DpCount] = { id: praefix + room + ".RoomTiltedWindowCount", initial: 0, forceCreation: false, common: { read: true, write: false, name: "Anzahl der gekippten Fenster im Raum", role: "state", type: "number", def: 0 } };
                DpCount++;
                States[DpCount] = { id: praefix + room + ".SendVentMsg", initial: true, forceCreation: false, common: { read: true, write: true, name: "Sollen für diesen Raum Lüftungsnachrichten ausgegeben werden?", type: "boolean", role: "state", def: true } }; //
                DpCount++;
                States[DpCount] = { id: praefix + room + ".SendOpenCloseMsg", initial: true, forceCreation: false, common: { read: true, write: true, name: "Sollen für diesen Raum Nachrichten bei öffnen/schliessen ausgegeben werden?", type: "boolean", role: "state", def: true } }; //
                DpCount++;
                States[DpCount] = { id: praefix + room + ".SendWarnMsg", initial: true, forceCreation: false, common: { read: true, write: true, name: "Sollen für diesen Raum Nachrichten für überschrittene Öffnungszeit ausgegeben werden?", type: "boolean", role: "state", def: true } }; //
                DpCount++;
                States[DpCount] = { id: praefix + room + ".IsOpen", initial: false, forceCreation: false, common: { read: true, write: false, name: "Fenster im Raum offen oder gekippt?", type: "boolean", role: "state", def: false } }; //
                DpCount++;
                States[DpCount] = { id: praefix + room + ".VentWarnTime", initial: 0, forceCreation: false, common: { read: true, write: true, name: "Anzahl der Tage nach der eine Lüftungsempfehlung erzeugt wird", unit: "Tage", type: "number", role: "state", def: 0 } };
                DpCount++;
                //log(Funktion + ': ' + room);
                if (RoomList.indexOf(room) == -1) { //Raumliste ohne Raumduplikate erzeugen
                    RoomList[z] = room;
                    if (logging) log("Raum " + z + " = " + RoomList[z]);
                    z++;
                };
                RoomOpenWindowCount[y] = 0; // Array mit 0 initialisieren
                RoomTiltedWindowCount[y] = 0; // Array mit 0 initialisieren
                RoomMsgCount[y] = 0;
                Laufzeit[y] = 0; // Array mit 0 initialisieren
            };
        };
    };
};

//Struktur anlegen in js.0 um Sollwert und Summenergebniss zu speichern
//Generische Datenpunkte vorbereiten 
States[DpCount] = { id: praefix + "AlleFensterZu", initial: true, forceCreation: false, common: { read: true, write: false, name: "Sind aktuell alle Fenster geschlossen?", type: "boolean", role: "state", def: true } }; //
DpCount++;
States[DpCount] = { id: praefix + "WindowsOpen", initial: 0, forceCreation: false, common: { read: true, write: false, name: "Anzahl der geöffneten Fenster", type: "number", def: 0 } };
DpCount++;
States[DpCount] = { id: praefix + "WindowsTilted", initial: 0, forceCreation: false, common: { read: true, write: false, name: "Anzahl der gekippten Fenster", type: "number", def: 0 } };
DpCount++;
States[DpCount] = { id: praefix + "RoomsWithOpenWindows", initial: "", forceCreation: false, common: { read: true, write: false, name: "In welchen Räumen sind Fenster geöffnet?", type: "string", def: "" } };
DpCount++;
States[DpCount] = { id: praefix + "RoomsWithTiltedWindows", initial: "", forceCreation: false, common: { read: true, write: false, name: "In welchen Räumen sind Fenster gekippt?", type: "string", def: "" } };
DpCount++;
States[DpCount] = { id: praefix + "RoomsWithVentWarnings", initial: "", forceCreation: false, common: { read: true, write: false, name: "In welchen Räumen ist eine Lüftungswarnung aktiv?", type: "string", def: "" } };
DpCount++;
States[DpCount] = { id: praefix + "LastMessage", initial: "", forceCreation: false, common: { read: true, write: false, name: "Die zuletzt ausgegebene Meldung?", type: "string", def: "" } };
DpCount++;
States[DpCount] = { id: praefix + "MessageLog", initial: "", forceCreation: false, common: { read: true, write: false, name: "Liste der letzten x ausgebenen Meldungen", type: "string", def: "" } };
DpCount++;
States[DpCount] = { id: praefix + "OverviewTable", initial: "", forceCreation: false, common: { read: true, write: false, name: "Übersicht aller Räume und geöffneten Fenster", type: "string", def: "" } };
DpCount++;
States[DpCount] = { id: praefix + "MuteMode", initial: 0, forceCreation: false, common: { read: true, write: true, name: "Stummschalten?", type: "number", min: 0, max: 2, def: 0 } };

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
    MessageLog = getState(praefix + "MessageLog").val;
    MuteMode = getState(praefix + "MuteMode").val;

    for (let x = 0; x < RoomList.length; x++) { //Messaging DPs einlesen
        SendVentMsg[x] = getState(praefix + RoomList[x] + ".SendVentMsg").val;
        SendOpenCloseMsg[x] = getState(praefix + RoomList[x] + ".SendOpenCloseMsg").val;
        SendWarnMsg[x] = getState(praefix + RoomList[x] + ".SendWarnMsg").val;
        if (logging) log("x=" + x + "=" + RoomList[x] + " SendWarnMsg=" + SendWarnMsg[x] + " SendVentMsg=" + SendVentMsg[x] + " SendOpenCloseMsg=" + SendOpenCloseMsg[x]);
    };

    for (let x = 0; x < Sensor.length; x++) { //Sensor Dps einlesen
        SensorVal[x] = SimplyfyWindowStates(getState(Sensor[x]).val, x); // Wert von Sensor in Schleife einlesen
        SensorOldVal[x] = "";
        CheckWindow(x);
    };

    for (let x = 0; x < RoomList.length; x++) { //Raum Dps einlesen
        RoomsWithVentWarnings[x] = "";
        VentWarnTime[x] = getState(praefix + RoomList[x] + ".VentWarnTime").val; //Lüftungswarnzeiten einlesen
        VentMsg[x] = ""; // Lüftungsnachricht mit Leerstring initialisieren
        VentCheck(x)
    };
    IsInit = false;
}

function main() {
    init(); //Bei Scriptstart alle Sensoren und Räume einlesen
    CreateTrigger(); //Trigger erstellen
    CreateRoomsWithOpenWindowsList(); //Übersichtsliste mit Räumen mit offenen Fenstern erstellen
    CreateRoomsWithTiltedWindowsList(); //Übersichtsliste mit Räumen mit offenen Fenstern erstellen
    CreateRoomsWithVentWarnings();
    CreateOverviewTable(); //HTML Tabelle erstellen
    Ticker(); //Minutenticker für Tabellenrefresh starten
}

function Meldung(msg) {
    if (logging) log("Reaching Meldung, msg= " + msg);

    if (MuteMode != 1 && MuteMode != 2) {
        if (UseSay) Say(msg);

        if (UseAlexa) {
            if (AlexaId != "") setState("alexa2.0.Echo-Devices." + AlexaId + ".Commands.announcement"/*announcement*/, msg);
        };
    };
    if (MuteMode != 2) {
        if (UseEventLog) {
            WriteEventLog(msg);
        };

        if (UseTelegram) {
            sendTo("telegram.0", "send", {
                text: msg
            });
        };

    if (UseMail) {
        sendTo("email", {
            html: msg
        });
    };
    }
    setState(praefix + "LastMessage", msg);
    WriteMessageLog(msg);
}

function WriteMessageLog(msg) {
    if (logging) log("Reaching WriteMessageLog, Message=" + msg);
    let LogEntrys = 0; //Arrayeinträge zählen

    let TempMessageLog = [];
    if (MessageLog == null) { //Fehler "Cannot read property 'split' of null" abfangen
        if (logging) log("MessageLog=null skiping split");
    }
    else {
        TempMessageLog = MessageLog.split(LogEntrySeparator); //Logstring in Array wandeln (Entfernt den Separator, deswegen am Funktionsende wieder anhängen)
    };

    if (AutoAddTimestamp) {
        LogEntrys = TempMessageLog.unshift(formatDate(new Date(), LogTimeStampFormat) + ": " + msg); //neuen Eintrag am Anfang des Array einfügen, Rückgabewert setzt Zähler
    } else {
        LogEntrys = TempMessageLog.unshift(msg); //neuen Eintrag am Anfang des Array einfügen, Rückgabewert setzt Zähler
    };

    if (LogEntrys > MaxLogEntrys) { //Wenn durchs anfügen MaxLogEntrys überschritten, einen Eintrag am Ende entfernen
        TempMessageLog.splice(MaxLogEntrys - LogEntrys); //Vom Ende des Arrays benötigte Anzahl Einträge löschen. Berücksichtig auch Einstellungsänderung auf niedrigere Zahl.
        LogEntrys = TempMessageLog.length;
    };
    log("TempMessageLog=" + TempMessageLog + " Logentrys=" + LogEntrys);
    MessageLog = TempMessageLog.join(LogEntrySeparator); //Array zu String wandeln und Separator anhängen
    setState(praefix + "MessageLog", MessageLog); //Logstring schreiben
}

function CreateOverviewTable() { //  Erzeugt tabellarische Übersicht als HTML Tabelle   
    let OverviewTable = "";

    //Überschrift
    if (ShowCaptionTbl) {
        OverviewTable += "<table style='width:100%; border-collapse: collapse; border: 0px solid black;'><tr><td style='height: 20px; text-align:center; padding-top: 5px; font-size:20px; font-weight: bold;'>Fensterstatus</td></tr></table>"
    };
    //Zusammenfassung
    if (ShowSummaryTbl) {
        OverviewTable += "<table style='width:100%; border-collapse: collapse; border: 0px solid black;'><tr><td style='height: 20px; text-align:center; padding-top: 5px; padding-bottom: 5px; font-size:16px; font-weight: normal;'>" + RoomsWithOpenWindows + "</td></tr></table>";
    };

    // Details / Head
    if (ShowDetailTbl) {
        OverviewTable += "<table style='width:100%; border-collapse: collapse;'>";
        OverviewTable += "<thead><tr><th width='40px' style='text-align:left;'</th><th width='20px' style='text-align:center;'></th><th style='text-align:left;'></th></tr></thead><tbody>";

        //Tabelle der Raumdetails
        for (let x = 0; x < RoomList.length; x++) { //Alle Räume durchgehen
            if (RoomOpenWindowCount[x] > 0) { // Räume mit offenen Fenstern
                RoomStateTimeCount[x] = CalcTimeDiff("now", RoomStateTimeStamp[x]);
                if (RoomTiltedWindowCount[x] == 0) { //Fenster ist offen, keines ist gekippt
                    OverviewTable += "<tr><td style='border: 1px solid black; background-color:" + OpenWindowColor + ";'><img style='margin: auto; display: block; filter: invert(" + ImgInvert + "); height: 40px;' src='" + WindowOpenImg + "'></td>";
                    OverviewTable += "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; font-size:16px; font-weight: bold; text-align:center;background-color:" + OpenWindowColor + ";'>" + RoomOpenWindowCount[x] + "</td>";
                    OverviewTable += "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; padding-top: 4px; font-size: 16px; font-weight: bold; background-color:" + OpenWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:bold;'>";
                    OverviewTable += "geöffnet";

                }
                else if (RoomTiltedWindowCount[x] == RoomOpenWindowCount[x]) { //Fenster ist gekippt
                    OverviewTable += "<tr><td style='border: 1px solid black; background-color:" + TiltedWindowColor + ";'><img style='margin: auto; display: block; filter: invert(" + ImgInvert + "); height: 40px;' src='" + WindowTiltedImg + "'></td>";
                    OverviewTable += "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; font-size:16px; font-weight: bold; text-align:center;background-color:" + TiltedWindowColor + ";'>" + RoomOpenWindowCount[x] + "</td>";
                    OverviewTable += "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; padding-top: 4px; font-size: 16px; font-weight: bold; background-color:" + TiltedWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:bold;'>";
                    OverviewTable += "gekippt";

                }
                else if (RoomTiltedWindowCount[x] < RoomOpenWindowCount[x]) { // Fenster sind offen und gekippt
                    OverviewTable += "<tr><td style='border: 1px solid black; background-color:" + OpenWindowColor + ";'><img style='margin: auto; display: block; filter: invert(" + ImgInvert + "); height: 40px;' src='" + WindowOpenTiltedImg + "'></td>";
                    OverviewTable += "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; font-size:16px; font-weight: bold; text-align:center;background-color:" + OpenWindowColor + ";'>" + RoomOpenWindowCount[x] + "</td>";
                    OverviewTable += "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; padding-top: 4px; font-size: 16px; font-weight: bold; background-color:" + OpenWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:bold;'>";
                    OverviewTable += "geöffnet/gekippt";

                };
                OverviewTable += ":<br> " + CreateTimeString(RoomStateTimeCount[x]) + "</div></td></tr>";
            }
            else { // Geschlossene Räume
                RoomStateTimeCount[x] = CalcTimeDiff("now", RoomStateTimeStamp[x]);
                if (VentMsg[x] == "") {
                    OverviewTable += "<tr><td style='border: 1px solid black; background-color:" + ClosedWindowColor + ";'><img style=' margin: auto; display: block; filter: invert(" + ImgInvert + "); height: 40px;'  src='" + WindowCloseImg + "'></td>";
                    OverviewTable += "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; font-size:16px; font-weight: bold; text-align:center; background-color:" + ClosedWindowColor + ";'>" + RoomOpenWindowCount[x] + "</td>";
                    OverviewTable += "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; padding-top: 4px; font-size: 16px; font-weight: bold; background-color:" + ClosedWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:normal;'>geschlossen:<br> " + CreateTimeString(RoomStateTimeCount[x]) + "</div></td></tr>";
                }
                else {
                    OverviewTable += "<tr><td style='border: 1px solid black; background-color:" + VentWarnColor + ";'><img style=' margin: auto; display: block; filter: invert(" + ImgInvert + "); height: 40px;'  src='" + VentImg + "'></td>";
                    OverviewTable += "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; font-size:16px; font-weight: bold; text-align:center; background-color:" + VentWarnColor + ";'>" + RoomOpenWindowCount[x] + "</td>";

                    OverviewTable += "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; padding-top: 4px; font-size: 16px; font-weight: bold; background-color:" + VentWarnColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:bold;'> nicht gelüftet:<br>" + CreateTimeString(RoomStateTimeCount[x]) + "</div></td></tr>";
                };
            };
        };
        OverviewTable += "</tbody></table>";
    };
    setState(praefix + "OverviewTable", OverviewTable);
}

function CalcTimeDiff(time1, time2) {
    if (time1 == "now") {
        time1 = new Date().getTime();
    };
    //if (logging) log("Reaching CalcTimeDiff, time1=" + time1 + ", time2=" + time2 + ", result= " + CreateTimeString(time1 - time2));
    return (time1 - time2);
}

function Ticker() {
    setInterval(function () { // Wenn 
        //if (logging) log("Refreshing OverviewTable")
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
    if (logging) log("Reaching CreateRoomsWithOpenWindowsList");
    RoomsWithOpenWindows = ""; //Liste Initialisieren
    for (let x = 0; x < RoomList.length; x++) { //Alle Räume durchgehen
        if (RoomOpenWindowCount[x] > 0) { // Nur Räume mit offenen Fenstern berücksichtigen
            if (RoomOpenWindowCount[x] == 1) { //Wenn 1 Fenster offen, Singular Schreibweise
                if (RoomTiltedWindowCount[x] == 1) { //Wenn das eine Fenster gekippt ist
                    RoomsWithOpenWindows += ReplaceChars(RoomList[x]) + " " + RoomOpenWindowCount[x] + " gekipptes Fenster" + OpenWindowListSeparator;
                }
                else {
                    RoomsWithOpenWindows += ReplaceChars(RoomList[x]) + " " + RoomOpenWindowCount[x] + " offenes Fenster" + OpenWindowListSeparator;
                };
            }
            else { //ansonsten Plural Schreibweise
                if (RoomTiltedWindowCount[x] == RoomOpenWindowCount[x]) { //Wenn gekippte Fenster = offene Fenster 
                    RoomsWithOpenWindows += RoomTiltedWindowCount[x] + " gekippte Fenster" + OpenWindowListSeparator;
                }
                else {
                    RoomsWithOpenWindows += ReplaceChars(RoomList[x]) + " " + RoomOpenWindowCount[x] + " offene Fenster" + OpenWindowListSeparator;
                    if (RoomTiltedWindowCount[x] == 1) { //Wenn 1 Fenster gekippt Singular schreibweise
                        RoomsWithOpenWindows += " davon " + RoomTiltedWindowCount[x] + " gekipptes Fenster" + OpenWindowListSeparator;
                    }
                    else if (RoomTiltedWindowCount[x] > 1) { //ansonsten Plural Schreibweise
                        RoomsWithOpenWindows += " davon " + RoomTiltedWindowCount[x] + " gekippte Fenster" + OpenWindowListSeparator;
                    };
                };
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

function CreateRoomsWithTiltedWindowsList() { //Erzeugt Textliste mit Räumen welche gekippte Fenster haben
    if (logging) log("Reaching CreateRoomsWithTiltedWindowsList");
    RoomsWithTiltedWindows = ""; //Liste Initialisieren
    for (let x = 0; x < RoomList.length; x++) { //Alle Räume durchgehen
        if (RoomTiltedWindowCount[x] > 0) { // Nur Räume mit offenen Fenstern berücksichtigen
            if (RoomTiltedWindowCount[x] == 1) { //Wenn 1 Fenster offen, Singular Schreibweise
                RoomsWithTiltedWindows += ReplaceChars(RoomList[x]) + " " + RoomTiltedWindowCount[x] + " gekipptes Fenster" + OpenWindowListSeparator;
            }
            else { //ansonsten Plural Schreibweise
                RoomsWithTiltedWindows += ReplaceChars(RoomList[x]) + " " + RoomOpenWindowCount[x] + " offene Fenster" + OpenWindowListSeparator;
            };
        };
    };
    RoomsWithTiltedWindows = RoomsWithTiltedWindows.substr(0, RoomsWithTiltedWindows.length - OpenWindowListSeparator.length); //letzten <br> Umbruch wieder entfernen

    if (RoomsWithTiltedWindows == "") {
        RoomsWithTiltedWindows = "Keine Fenster gekippt";
    };
    setState(praefix + "RoomsWithTiltedWindows", RoomsWithTiltedWindows);
    if (logging) log("RoomsWithTiltedWindows: " + RoomsWithTiltedWindows);
}


function CreateRoomsWithVentWarnings(x, Warning) { //Erzeugt Liste mit Räumen für die eine Lüftungswarnung besteht
    let Tempstring = "";
    if (logging) log("Reaching CreateRoomsWithVentWarnings");
    RoomsWithVentWarnings[x] = Warning;

    for (let y = 0; y < RoomsWithVentWarnings.length; y++) {
        if (RoomsWithVentWarnings[y] != "")
            Tempstring += RoomList[y] + " nicht gelüftet seit: " + RoomsWithVentWarnings[y] + OpenWindowListSeparator;
    };
    Tempstring = Tempstring.substr(0, Tempstring.length - OpenWindowListSeparator.length);
    setState(praefix + "RoomsWithVentWarnings", Tempstring);
}

function VentCheck(x) { //Überprüft wie lange Räume geschlossen sind und gibt Lüftungswarnung aus
    if (logging) log("Reaching VentCheck x=" + x + " Init=" + IsInit + " VentwarnTime[x]=" + VentWarnTime[x] + " RoomStateTimeStamp[x]=" + RoomStateTimeStamp[x]);

    if (RoomOpenWindowCount[x] == 0 && VentWarnTime[x] != 0) { //VentTimeout starten wenn Raum geschlossen und Warnzeit nicht 0 (= deaktiviert) 
        if (logging) log("Starting VentInterval for Room " + RoomList[x] + " Time set to: " + VentWarnTime[x] + " days");
        if (IsInit) { //Bei Skriptstart
            if (CalcTimeDiff("now", RoomStateTimeStamp[x]) >= getDateObject(VentWarnTime[x] * 24 * 60 * 60 * 1000).getTime()) { //Wenn Ventwarnzeit bei Skriptstart schon überschritten, sofortige Meldung
                VentMsg[x] = CreateTimeString(RoomStateTimeCount[x]);
                CreateRoomsWithVentWarnings(x, VentMsg[x]);
                if (SendVentMsg[x]) Meldung(ReplaceChars(RoomList[x]) + " nicht gelüftet " + VentMsg[x]);
            } else { //Wenn Ventwarnzeit bei Skriptstart noch nicht überschritten, Restzeit berechnen und einmaligen Timeout starten welcher bei Ablauf den regulären Interval startet

                if (logging) log("Remaining Vent Warn DiffTime at startup= " + CreateTimeString(CalcTimeDiff(VentWarnTime[x] * 24 * 60 * 60 * 1000, RoomStateTimeCount[x])))
                VentMsgHandler[x] = setTimeout(function () {
                    RoomStateTimeCount[x] = CalcTimeDiff("now", RoomStateTimeStamp[x]); //RoomstateTimeCount aktualisieren um exakten Wert bei Ausgabe zu haben und 23 Stunden 59 Minuten Meldungen zu vermeiden

                    VentMsg[x] = CreateTimeString(RoomStateTimeCount[x]);
                    CreateRoomsWithVentWarnings(x, VentMsg[x]);
                    if (SendVentMsg[x]) {
                        Meldung(ReplaceChars(RoomList[x]) + " nicht gelüftet " + VentMsg[x]);
                        CreateOverviewTable();
                    };
                    if (logging) log("Init Vent Timeout exceeded now calling regular Interval for x=" + x);
                    VentCheck(x);
                }, CalcTimeDiff(VentWarnTime[x] * 24 * 60 * 60 * 1000, RoomStateTimeCount[x]));

            };

        } else { //Normalbetrieb, kein Init
            VentMsgHandler[x] = setInterval(function () { // Neuen Timeout setzen, volle Warnzeit 
                RoomStateTimeCount[x] = CalcTimeDiff("now", RoomStateTimeStamp[x]); //RoomstateTimeCount aktualisieren um exakten Wert bei Ausgabe zu haben und 23 Stunden 59 Minuten Meldungen zu vermeiden
                VentMsg[x] = CreateTimeString(RoomStateTimeCount[x]); //Watch!!
                CreateRoomsWithVentWarnings(x, VentMsg[x])
                if (SendVentMsg[x]) {
                    Meldung(ReplaceChars(RoomList[x]) + " nicht gelüftet " + VentMsg[x]);
                    CreateOverviewTable();
                };
            }, VentWarnTime[x] * 24 * 60 * 60 * 1000);
        };

        if (logging) log("VentMsg=" + VentMsg[x]);
    }
    else {
        if (logging) log("Room " + x + " = " + RoomList[x] + " is open or disabled, no vent warning set");
        CreateRoomsWithVentWarnings(x, "");
        ClearVentTime(x);
        VentMsg[x] = "";
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

function CheckWindow(x) { //Für einzelnes Fenster. Via Trigger angesteuert. Eigentliche Primärauswertefunktion des Skriptes
    let TempRoom = GetRoom(x); //Raum des aktuellen Sensors bestimmen
    let TempRoomIndex = RoomList.indexOf(TempRoom); // Raumlistenindex für aktuellen Raum bestimmen
    if (logging) log("reaching CheckWindow, SensorVal[" + x + "]=" + SensorVal[x] + " SensorOldVal=" + SensorOldVal[x] + " TempRoom=" + TempRoom)

    if (((SensorVal[x] == "open") && (SensorOldVal[x] == "closed" || SensorOldVal[x] == "" || SensorOldVal[x] != "tilted")) || ((SensorVal[x] == "tilted") && (SensorOldVal[x] == "closed" || SensorOldVal[x] == "" || SensorOldVal[x] != "open"))) { //Fenster war geschlossen und wurde geöffnet oder gekippt - Wechsel von open auf tilted nicht berücksichtigt!!!
        if (RoomOpenWindowCount[TempRoomIndex] == 0) setState(praefix + TempRoom + ".IsOpen", true);

        OpenWindowCount++; //Gesamtfensterzähler erhöhen
        RoomOpenWindowCount[TempRoomIndex]++; //Raumfensterzähler erhöhen

        if (logging) log("RoomOpenWindowCount für " + TempRoom + "=" + RoomOpenWindowCount[TempRoomIndex]);
        setState(praefix + TempRoom + ".RoomOpenWindowCount", RoomOpenWindowCount[TempRoomIndex]);

        if (!IsInit) {
            if (RoomOpenWindowCount[TempRoomIndex] == 1) {
                RoomStateTimeStamp[TempRoomIndex] = new Date().getTime(); //Bei Erstöffnung Zeitstempel für Raum auf jetzt setzen
            }
            if (SensorVal[x] == "open") {
                if (logging) log(TempRoom + " Fenster geöffnet");
                if (SendOpenCloseMsg[TempRoomIndex]) Meldung(ReplaceChars(TempRoom) + " Fenster geöffnet!");
                if (UseEventLog) WriteEventLog(ReplaceChars(TempRoom) + " Fenster geöffnet!");
            }
            else if (SensorVal[x] == "tilted") {
                if (logging) log(TempRoom + " Fenster gekippt");
                if (SendOpenCloseMsg[TempRoomIndex]) Meldung(ReplaceChars(TempRoom) + " Fenster gekippt!");
                if (UseEventLog) WriteEventLog(ReplaceChars(TempRoom) + " Fenster gekippt!");
            };

        };

        if (RoomOpenWindowCount[TempRoomIndex] == 1) {
            log("SendWarnMsg=" + SendWarnMsg[TempRoomIndex] + " TempRoomIndex=" + TempRoomIndex)
            Laufzeit[TempRoomIndex] = 0;
            if (SendWarnMsg[TempRoomIndex]) {
                if (logging) log("Setting Interval to Room:" + TempRoom);
                OpenWindowMsgHandler[TempRoomIndex] = setInterval(function () {// Interval starten und Dauer bei Ansage aufaddieren
                    Laufzeit[TempRoomIndex] = Laufzeit[TempRoomIndex] + ZeitBisNachricht;
                    if (RoomMsgCount[TempRoomIndex] <= MaxMessages - 1) Meldung(ReplaceChars(TempRoom) + "fenster seit " + CreateTimeString(CalcTimeDiff("now", RoomStateTimeStamp[TempRoomIndex])) + " geöffnet!");
                    RoomMsgCount[TempRoomIndex]++;
                }, ZeitBisNachricht);
            };
        };
    }
    else if (SensorVal[x] == "closed") {
        if (!IsInit) { // Wenn nicht in Initialisierungsphase (Skriptstart)
            if (OpenWindowCount > 0) OpenWindowCount--;
            if (RoomOpenWindowCount[TempRoomIndex] > 0) RoomOpenWindowCount[TempRoomIndex]--;
            if (RoomOpenWindowCount[TempRoomIndex] == 0) { // Wenn letztes Fenster geschlossen
                RoomStateTimeStamp[TempRoomIndex] = new Date().getTime(); //Bei schliessen Zeitstempel für Raum setzen
                if (logging) log(TempRoom + " Fenster geschlossen.");
                if (SendOpenCloseMsg[TempRoomIndex]) Meldung(ReplaceChars(TempRoom) + " Fenster geschlossen!");
                if (UseEventLog) WriteEventLog(ReplaceChars(TempRoom) + " Fenster geschlossen!");
            };
        };

        setState(praefix + TempRoom + ".RoomOpenWindowCount", RoomOpenWindowCount[TempRoomIndex]);

        if (RoomOpenWindowCount[TempRoomIndex] == 0) { //Wenn alle Fenster im Raum geschlossen, Dp aktualisieren und Intervall/Timeout löschen
            setState(praefix + TempRoom + ".IsOpen", false);
            ClearWarnTime(TempRoomIndex);

        };

    };

    //*************Bereich gekippte Fenster */
    if (SensorVal[x] == "tilted") {
        if (logging) log("Reaching tilted+ in checkWindow");
        TiltedWindowCount++; //Gekippte Fenster Zähler erhöhen
        RoomTiltedWindowCount[TempRoomIndex]++;
        setState(praefix + TempRoom + ".RoomTiltedWindowCount", RoomTiltedWindowCount[TempRoomIndex]);
        if (logging) log("TiltedWindowCount=" + TiltedWindowCount + " RoomTiltedWindowCount=" + RoomTiltedWindowCount[TempRoomIndex] + " TempRoomIndex=" + TempRoomIndex)
    }
    else if ((SensorVal[x] != "tilted" && SensorOldVal[x] == "tilted") && IsInit == false) { //Bei Wechsel von gekippt auf offen oder geschlossen und keine Initphase
        if (logging) log("Reaching tilted- in checkWindow");
        TiltedWindowCount--; //Gekippte Fenster Zähler erniedrigen
        RoomTiltedWindowCount[TempRoomIndex]--;
        if (TiltedWindowCount < 0) TiltedWindowCount = 0;
        if (RoomTiltedWindowCount[x] < 0) RoomTiltedWindowCount[x] = 0;

        setState(praefix + TempRoom + ".RoomTiltedWindowCount", RoomTiltedWindowCount[TempRoomIndex]);
        if (logging) log("TiltedWindowCount=" + TiltedWindowCount + " RoomTiltedWindowCount=" + RoomTiltedWindowCount[TempRoomIndex] + " TempRoomIndex=" + TempRoomIndex)
    };

    if (IsInit && RoomTiltedWindowCount[TempRoomIndex] == 0) {
        setState(praefix + TempRoom + ".RoomTiltedWindowCount", RoomTiltedWindowCount[TempRoomIndex]);
    };
    /***************Ende Bereich gekippte Fenster */

    if (OpenWindowCount == 0) { //Wenn kein Fenster mehr offen Datenpunkte aktualisieren
        setState(praefix + "WindowsOpen", 0);
        setState(praefix + "WindowsTilted", 0);
        setState(praefix + "AlleFensterZu", true);
        log("Alle Fenster geschlossen.");
    }
    else { //ansonsten ebenfalls Datenpunkte (mit anderen Werten) aktualisieren
        setState(praefix + "WindowsOpen", OpenWindowCount);
        setState(praefix + "WindowsTilted", TiltedWindowCount);
        setState(praefix + "AlleFensterZu", false);
    };

    if (logging) log("Offene Fenster gesamt= " + OpenWindowCount);

    if (IsInit) { // Wenn in Initialisierungsphase (Skriptstart)
        RoomStateTimeStamp[TempRoomIndex] = getState(praefix + RoomList[TempRoomIndex] + ".IsOpen").lc;
    }
    else {
        VentCheck(TempRoomIndex);
        if (logging) log("RoomStateTimeStamp at checkWindow= " + RoomStateTimeStamp[TempRoomIndex] + " ms =" + formatDate(RoomStateTimeStamp[TempRoomIndex], LogTimeStampFormat));
    };

    RoomStateTimeCount[TempRoomIndex] = CalcTimeDiff("now", RoomStateTimeStamp[TempRoomIndex]);
}

function CheckForHmShit(val, x) {
    if (logging) log("Reaching CheckForHmShit val=" + val + " typof val=" + typeof (val) + " x=" + x + " Sensor[x]=" + Sensor[x]);

    if (Sensor[x].indexOf("hm-rpc.0") != -1) { //Prüfen ob Sensor= HM Sensor
        if (getObject(Sensor[x]).common.states) { //Prüfen ob Wertelistentext vorhanden
            if (logging) log(Sensor[x] + " hat Zustandstext " + getObject(Sensor[x]).common.states[val] + ", Wert= " + val + " Wert wird durch Zustandstext ersetzt");
            return getObject(Sensor[x]).common.states[val]; //Wert durch Zustandstext ersetzen um HM Wertekuddelmuddel bei HM Sensoren zu kompensieren und in Kleinbuchstaben wandeln
        }
        else {
            // if (logging) log(Sensor[x] + " hat keinen Zustandstext, Wert wird beibehalten")
            return val;
        };
    }
    else {
        // if (logging) log(Sensor[x] + " hat keinen Zustandstext, Wert wird beibehalten")
        return val;
    };

}


function SimplyfyWindowStates(val, x) { //Die verschiedenen Gerätestates zu open, close oder tilted vereinfachen

    val = String(val).toLowerCase();
    val = CheckForHmShit(val, x);


    if (WindowIsOpenWhen.indexOf(val) != -1) { // Suche in Fensteroffenarray, wenn gefunden, Status auf open setzen
        return "open";
    }
    else if (WindowIsClosedWhen.indexOf(val) != -1) { // Suche in Fenstergeschlossenarray, wenn gefunden, Status auf closed setzen
        return "closed";
    }
    else if (WindowIsTiltedWhen.indexOf(val) != -1) { // Suche in Fenstergekipptarray, wenn gefunden, Status auf tilted setzen
        return "tilted";
    };

    if (val != "open" && val != "closed" && val != "tilted") { // Suche in Fensteroffenarray und Fenstergeschlossenarray, wenn nirgends gefunden, Status auf closed setzen und Logwarnung ausgeben
        log("Unknown Windowstate " + SensorVal[x] + " detected at " + Sensor[x] + ", please check your configuration", "warn");
        return "unknown";
    };
}

function CreateTimeString(mstime) {
    let TimeString;
    mstime += 1000; //Eine Sekunde erhöhen um 59Min, 59Sek Meldungen zu vermeiden
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
    //if (logging) log("days=" + days + ", hours=" + hours + ", mins=" + mins + ", seks=" + seks + ", Timestring=" + TimeString)

    return TimeString.trim();
}

function ClearVentTime(x) {
    if (typeof (VentMsgHandler[x]) == "object") { //Wenn ein Interval oder Timeout gesetzt ist, löschen
        if (logging) log("Clearing Interval for " + x)
        clearInterval(VentMsgHandler[x]);
        clearTimeout(VentMsgHandler[x]);
    };
}

function ClearWarnTime(x) {
    if (logging) log("reaching ClearWarnTime - [x] = " + [x]);

    if (typeof (OpenWindowMsgHandler[x]) == "object") { //Wenn ein Interval gesetzt ist, löschen
        if (logging) log("Clearing Interval for " + x)
        clearInterval(OpenWindowMsgHandler[x]); //
        RoomMsgCount[x] = 0; //Nachrichtenzähler wieder resetten
    };
}

function CreateTrigger() {
    //Trigger für Sensoren erzeugen
    for (let x = 0; x < Sensor.length; x++) { //Alle Sensoren durchlaufen
        IgnoreInProcess[x] = true;
        on(Sensor[x], function (dp) { //Trigger in Schleife erstellen
            if (logging) log("Trigger= " + x + " Wert= " + dp.state.val + " Alter Wert= " + dp.oldState.val);
            if (dp.channelId.search(praefix) == -1) { //Ausschliessen dass das Scriptverzeichnis zum Triggern verwendet wird
                if (IgnoreInProcess[x] == true) { //Bei erster Triggerung aktuellen Sensorwert merken und Timeout starten
                    log("Oldstate=" + dp.oldState.val)
                    IgnoreValue[x] = SimplyfyWindowStates(dp.oldState.val, x);
                    IgnoreInProcess[x] = false;
                    if (logging) log("Activating Ignore Timeout for " + x + ", Value to ignore=" + IgnoreValue[x]);
                    setTimeout(function () {
                        if (logging) log("InTimeout - Trigger= " + x + " Wert= " + dp.state.val + " Alter Wert= " + dp.oldState.val);
                        if (SimplyfyWindowStates(getState(Sensor[x]).val, x) != IgnoreValue[x]) { //Nachdem Timeout abgelaufen, vergleichen ob gemerkter Wert mit aktuellem Wert übereinstimmt, wenn nicht, Aktionen starten
                            if (logging) log("Ignore Timeout for " + x + " exceeded, Value change happend, starting Functions");
                            SensorVal[x] = SimplyfyWindowStates(getState(Sensor[x]).val, x); // Alles in String und Kleinschreibweise wandeln
                            SensorOldVal[x] = IgnoreValue[x]; // Alles in String und Kleinschreibweise wandeln
                            CheckWindow(x);
                            CreateRoomsWithOpenWindowsList();
                            CreateRoomsWithTiltedWindowsList();
                            CreateOverviewTable();
                        } else {
                            if (logging) log("Ignore Timeout for " + x + " exceeded, no Value change, nothing to do. Actual Value=" + SimplyfyWindowStates(getState(Sensor[x]).val, x) + " remembered Value=" + IgnoreValue[x]);
                        };
                        IgnoreInProcess[x] = true;
                    }, IgnoreTime);
                };
            }
            else {
                log("Fehler, Datenpunkt im Scriptverzeichnis als Trigger definiert", "error");
            };
        });
    };

    //Trigger für Räume erzeugen
    for (let x = 0; x < RoomList.length; x++) { //Alle Räume durchlaufen
        on(praefix + RoomList[x] + ".VentWarnTime", function (dp) { //Trigger für VentwarnTime Einstellfeld in Schleife erstellen
            if (logging) log("Raum= " + RoomList[x] + " VentWarnTime= " + dp.state.val + " Alter Wert= " + dp.oldState.val);
            VentWarnTime[x] = dp.state.val;
            IsInit = true
            ClearVentTime(x);
            VentMsg[x] = "";
            VentCheck(x);
            IsInit = false
            CreateOverviewTable();
        });
        on(praefix + RoomList[x] + ".SendVentMsg", function (dp) { //Trigger für SendMsgDps erzeugen
            SendVentMsg[x] = dp.state.val;
        });
        on(praefix + RoomList[x] + ".SendOpenCloseMsg", function (dp) { //Trigger
            SendOpenCloseMsg[x] = dp.state.val;
        });
        on(praefix + RoomList[x] + ".SendWarnMsg", function (dp) { //Trigger
            SendWarnMsg[x] = dp.state.val;
            ClearWarnTime(x);
        });
    };

    //Trigger für MuteMode erzeugen
    on(praefix + "MuteMode", function (dp) { //Trigger in Schleife erstellen
        MuteMode = dp.state.val;
    });

    onStop(function () { //Bei Scriptende alle Timer löschen
        for (let x = 0; x < RoomList.length; x++) {
            ClearVentTime(x);
            ClearWarnTime(x)
        };
    }, 100);
}
