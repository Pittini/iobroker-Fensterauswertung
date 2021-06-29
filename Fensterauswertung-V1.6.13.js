const Skriptversion = "1.6.13" //vom 29.06.2021 - https://github.com/Pittini/iobroker-Fensterauswertung - https://forum.iobroker.net/topic/31674/vorlage-generisches-fensteroffenskript-vis
//Script um offene Fenster/Türen pro Raum und insgesamt zu zählen.
//Möglichkeit eine Ansage nach x Minuten einmalig oder zyklisch bis Fensterschließung anzugeben
//Dynamische erzeugung einer HTML Übersichtstabelle
//WICHTIG!!!
//Vorraussetzungen: Den Geräten müssen Räume zugewiesen sein, sowie die Funktion "Fenster" bzw "Tuer" für jeden entsprechenden Datenpunkt.

//Grundeinstellungen
const logging = false; //Erweiterte Logs ausgeben?
const praefix = "javascript.0.FensterUeberwachung."; //Grundpfad für Script DPs - Muß innerhalb javascript.x sein.
const PresenceDp = "" //Pfad zum Anwesenheitsdatenpunkt, leer lassen wenn nicht vorhanden
const WhichWindowFunctionToUse = "Fenster"; // Legt fest nach welchem Begriff in Funktionen gesucht wird. Diese Funktion nur dem Datenpunkt zuweisen, NICHT dem ganzen Channel!
const WhichDoorFunctionToUse = "Tuer"; // Legt fest nach welchem Begriff in Funktionen gesucht wird. Diese Funktion nur dem Datenpunkt zuweisen, NICHT dem ganzen Channel!
const WindowIgnoreTime = 10000; // 10000 ms = 10 Sekunden - Zeit in ms für die kurzzeitiges öffnen/schliessen ignoriert wird
const DoorIgnoreTime = 1000; // 1000 ms = 1 Sekunden - Zeit in ms für die kurzzeitiges öffnen/schliessen ignoriert wird


//Nachrichteneinstellungen
const TimeToWindowMsg = 900000 // 300000 ms = 5 Minuten - Zyklus- bzw. Ablaufzeit für Fenster-offenwarnung/en
const TimeToDoorMsg = 300000 // 300000 ms = 5 Minuten - Zyklus- bzw. Ablaufzeit für Tür-offenwarnung/en

const MaxMessages = 1; //Maximale Anzahl der Nachrichten pro Raum 

//Telegram
const UseTelegram = false; // Sollen Nachrichten via Telegram gesendet werden?

//Pushover
const UsePushover = false; // Sollen Nachrichten via PushOver gesendet werden?
const PushOverInstance = "pushover.0"; //Pushoverinstanz welche genutzt werden soll angeben
const PushOverDevice = "All"; //Welches Gerät soll die Nachricht bekommen
const PushOverTitle = "Fensterüberwachung";
const PushOverSound = "none"; //Welcher Sound soll abgespielt werden? "none" für kein Sound, "" für Standartsound, ansonsten Namen angeben z.B. "magic"

//Alexa
const UseAlexa = false; // Sollen Nachrichten via Alexa ausgegeben werden?
const AlexaInstance = "alexa2.0";
const AlexaId = ""; // Die Alexa Seriennummer.
const AlexaVolume = "50"; // Lautstärke der Nachrichten. Wert von 1 bis 100

//Other
const UseMail = false; //Nachricht via Mail versenden?
const UseSay = true; // Sollen Nachrichten via Say ausgegeben werden? Autorenfunktion, muß deaktiviert werden.
const UseEventLog = true; // Sollen Nachrichten ins Eventlog geschreiben werden? Autorenfunktion, muß deaktiviert werden.

const NoMsgAtPresence = false; //Sollen Nachrichten bei Anwesenheit unterdrückt werden?

//Tabelleneinstellungen
const DoorOpenImg = "/icons-mfd-svg/fts_door_open.svg"; //Icon für Tür offen
const DoorCloseImg = "/icons-mfd-svg/fts_door.svg"; // Icon für Tür geschlossen
const DoorTiltedImg = "/icons-mfd-svg/fts_door_tilt.svg" // Icon für Tür gekippt
const WindowOpenImg = "/icons-mfd-svg/fts_window_1w_open.svg"; //Icon für Fenster offen
const WindowCloseImg = "/icons-mfd-svg/fts_window_1w.svg"; // Icon für Fenster geschlossen
const WindowTiltedImg = "/icons-mfd-svg/fts_window_1w_tilt.svg" //Icon für Fenster gekippt
const WindowOpenTiltedImg = "/icons-mfd-svg/fts_window_2w_open_l_tilt_r.svg" //Icon für offen und gekippt in einem Raum gleichzeitig
const VentImg = "/icons-mfd-svg/vent_ventilation.svg"; //Icon für Lüftungsinfo
const ImgInvert = 1; // Bildfarben invertieren? Erlaubte Werte von 0 bis 1
const OpenWindowColor = "#f44336"; // Farbe für Fenster offen
const OpenDoorColor = "darkorange"; //Farbe für Tür offen
const TiltedWindowColor = "#F56C62"; //Farbe für gekippte Fenster o. Tür/en
const ClosedWindowColor = "#4caf50"; // Farbe für geschlossene Fenster o. Tür/en
const VentWarnColor = "#ffc107"; // Farbe für Lüftungswarnung
const ShowCaptionTbl = false; // Überschrift anzeigen?
const ShowSummaryTbl = true; // Zusammenfassung anzeigen?
const ShowDetailTbl = true; // Details anzeigen?
const RoomSortMode = 1; //0= Raumliste unsortiert, 1= alpabetisch sortiert, 2= Benutzerdefinierte Sortierung

//Logeinstellungen
const MaxLogEntrys = 20; //Maximale Anzahl der zu speichernden Logeinträge
const AutoAddTimestamp = true; //Soll den geloggten Nachrichten automatisch ein Zeitsempel zugeordnet werden?
const LogTimeStampFormat = "TT.MM.JJJJ SS:mm:ss"; //Zeitformatierung für Log Zeitstempel
const LogEntrySeparator = "<br>"; //Trennzeichen für Logeinträge

//Ab hier nix mehr ändern!
const SendVentMsg = [];
const SendDoorOpenCloseMsg = [];
const SendWindowOpenCloseMsg = [];
const SendWindowWarnMsg = [];
const SendDoorWarnMsg = [];

const OpenWindowListSeparator = "<br>"; //Trennzeichen für die Textausgabe der offenen Fenster pro Raum

const WindowIsOpenWhen = ["true", "offen", "open", "opened", "2"]; // Hier können eigene States für offen angegeben werden, immer !!! in Kleinschreibung
const WindowIsClosedWhen = ["false", "geschlossen", "closed", "0"]; // Hier können eigene States für geschlossen angegeben werden, immer !!! in Kleinschreibung
const WindowIsTiltedWhen = ["tilted", "gekippt", "1"]; // Hier können eigene States für gekippt angegeben werden, immer !!! in Kleinschreibung

let OpenDoorCount = 0;  // Gesamtzahl der geöffneten Türen
let TiltedDoorCount = 0;  // Gesamtzahl der gekippten Türen
let OpenWindowCount = 0; // Gesamtzahl der geöffneten Fenster
let TiltedWindowCount = 0; // Davon Anzahl der gekippten Fenster

const RoomOpenCount = [];  // Array für Summe geöffneter Verschlüsse pro Raum
const RoomOpenDoorCount = [];  // Array für Zähler offene Türen pro Raum
const RoomTiltedDoorCount = [];  // Array für Zähler gekippte Türen pro Raum
const RoomOpenWindowCount = []; // Array für Zähler offene Fenster pro Raum
const RoomTiltedWindowCount = []; // Array für Zähler gekippte Fenster pro Raum
const RoomWindowMsgCount = []; //Zähler für bereits ausgegebene Fenster Warnmeldungen
const RoomDoorMsgCount = []; //Zähler für bereits ausgegebene Tür Warnmeldungen
let RoomHas = [] // 0=Weder Tür noch Fenster, 1 Tür, 2 Fenster, 3 Tür und Fenster
const RoomsWithCombinedOpenings = [];
let RoomsWithOpenings = ""; // Kombinierte Liste mit offenen Türen und Fenstern
let RoomsWithOpenDoors = ""; //Liste der Räume mit offenen Türen
let RoomsWithTiltedDoors = ""; //Liste der Räume mit offenen Türen
let RoomsWithOpenWindows = ""; //Liste der Räume mit offenen  Fenstern
let RoomsWithTiltedWindows = ""; //Liste der Räume mit gekippten Fenstern
let RoomsWithVentWarnings = []; //Räume mit Lüftungswarnung
let RoomListOrderPriority = ""; //Sortierreihenfolge der Raumliste

const OpenWindowMsgHandler = []; // Objektarray für timeouts pro Raum/Fenster
const OpenDoorMsgHandler = []; // Objektarray für timeouts pro Raum/Tür
const IgnoreValue = []; //Vergleichswert für IgnoreTimeout
const VentMsgHandler = []; //Timeout/Intervall Objekt
const VentMsg = []; //Lüftungsnachricht
const Sensor = []; //Sensoren als Array anlegen
let SensorType = []; //Unterscheidung zwischen Tür und Fenstersensor
const SensorVal = [];//Sensorwerte als Array anlegen
const SensorOldVal = []; //Alte Sensorwerte als Array ablegen
const WindowWarnRuntime = []; //Timer WindowWarnRuntime pro Fenster
const DoorWarnRuntime = []; //Timer DoorWarnRuntime pro Tür
const VentWarnTime = []; // Array mit Zeiten nach dem eine Lüftungsempfehlung ausgegeben wird
let RoomList = []; // Raumlisten Array
const RoomStateTimeStamp = []; //Letzte Änderung des Fenster-Raumstatus
const RoomStateTimeCount = []; // Zeitspanne seit letzter Änderung
const RoomDoorStateTimeStamp = []; //Letzte Änderung des Tür-Raumstatus
const RoomDoorStateTimeCount = []; // Zeitspanne seit letzter Änderung
let z = 0; //Zähler
let DpCount = 0; //Zähler
let IsInit = true // Marker - Wird nach initialisierung auf false gesetzt
// /** @type {{ id: string, initial: any, forceCreation: boolean, common: iobJS.StateCommon }[]} */
const States = []; // Array mit anzulegenden Datenpunkten
let Funktionen = getEnums('functions'); //Array mit Aufzählung der Funktionen
let MessageLog = ""; //Log der ausgegebenen Meldungen
let MuteMode = 0; //Stummschaltungsmodus für Nachrichten. 0=Alles erlaubt, 1=Sprachnachrichten deaktivieren, 2=Alles deaktivieren
let Presence = true; //Anwesenheit als gegeben initialisieren
const IgnoreInProcess = []; //Läuft gerade eine Überprüfung ob eine Statusänderung ignoriert werden muß?
let SensorCount = 0; //Hilfszähler weil y bei mehreren Funktionen mehrmals bei 0 beginnt

log("starting Fensterskript, Version " + Skriptversion);

for (let x in Funktionen) {        // loop ueber alle Functions

    let Funktion = Funktionen[x].name;
    if (typeof Funktion == "undefined") {
        log("Keine Funktion gefunden", "error");
    }
    else {
        if (typeof Funktion == 'object') Funktion = Funktion.de;
        let members = Funktionen[x].members;
        if (Funktion == WhichWindowFunctionToUse || Funktion == WhichDoorFunctionToUse) { //Wenn Function ist Fenster oder Tür
            for (let y in members) { // Loop über alle Fenster/Tür Members
                Sensor[SensorCount] = members[y];

                let room = getObject(Sensor[SensorCount], 'rooms').enumNames[0];
                if (typeof room == 'object') room = room.de;
                if (RoomList.indexOf(room) == -1) { //Raumliste ohne Raumduplikate und zugehörige Dps erzeugen
                    //Datenpunkte pro Raum vorbereiten
                    States[DpCount] = { id: praefix + room + ".RoomOrderPriority", initial: z, forceCreation: false, common: { read: true, write: true, name: "Raumpriorität für Tabelle", role: "state", type: "number", def: z } };
                    DpCount++;
                    States[DpCount] = { id: praefix + room + ".RoomOpenCount", initial: 0, forceCreation: false, common: { read: true, write: false, name: "Summe der geöffneten Fenster und Türen im Raum", role: "state", type: "number", def: 0 } };
                    DpCount++;
                    States[DpCount] = { id: praefix + room + ".RoomOpenDoorCount", initial: 0, forceCreation: false, common: { read: true, write: false, name: "Anzahl der geöffneten Türen im Raum", role: "state", type: "number", def: 0 } };
                    DpCount++;
                    States[DpCount] = { id: praefix + room + ".RoomTiltedDoorCount", initial: 0, forceCreation: false, common: { read: true, write: false, name: "Anzahl der gekippten Türen im Raum", role: "state", type: "number", def: 0 } };
                    DpCount++;
                    States[DpCount] = { id: praefix + room + ".RoomOpenWindowCount", initial: 0, forceCreation: false, common: { read: true, write: false, name: "Anzahl der geöffneten Fenster im Raum", role: "state", type: "number", def: 0 } };
                    DpCount++;
                    States[DpCount] = { id: praefix + room + ".RoomTiltedWindowCount", initial: 0, forceCreation: false, common: { read: true, write: false, name: "Anzahl der gekippten Fenster im Raum", role: "state", type: "number", def: 0 } };
                    DpCount++;
                    States[DpCount] = { id: praefix + room + ".SendVentMsg", initial: true, forceCreation: false, common: { read: true, write: true, name: "Sollen für diesen Raum Lüftungsnachrichten ausgegeben werden?", type: "boolean", role: "state", def: true } }; //
                    DpCount++;
                    States[DpCount] = { id: praefix + room + ".SendDoorOpenCloseMsg", initial: true, forceCreation: false, common: { read: true, write: true, name: "Sollen für diesen Raum Nachrichten bei öffnen/schliessen von Türen ausgegeben werden?", type: "boolean", role: "state", def: true } }; //
                    DpCount++;
                    States[DpCount] = { id: praefix + room + ".SendWindowOpenCloseMsg", initial: true, forceCreation: false, common: { read: true, write: true, name: "Sollen für diesen Raum Nachrichten bei öffnen/schliessen von Fenstern ausgegeben werden?", type: "boolean", role: "state", def: true } }; //
                    DpCount++;
                    States[DpCount] = { id: praefix + room + ".SendWindowWarnMsg", initial: true, forceCreation: false, common: { read: true, write: true, name: "Sollen für diesen Raum Nachrichten für überschrittene Fenster Öffnungszeit ausgegeben werden?", type: "boolean", role: "state", def: true } }; //
                    DpCount++;
                    States[DpCount] = { id: praefix + room + ".SendDoorWarnMsg", initial: true, forceCreation: false, common: { read: true, write: true, name: "Sollen für diesen Raum Nachrichten für überschrittene Tür Öffnungszeit ausgegeben werden?", type: "boolean", role: "state", def: true } }; //
                    DpCount++;
                    States[DpCount] = { id: praefix + room + ".WindowIsOpen", initial: false, forceCreation: false, common: { read: true, write: false, name: "Fenster im Raum offen oder gekippt?", type: "boolean", role: "state", def: false } }; //
                    DpCount++;
                    States[DpCount] = { id: praefix + room + ".DoorIsOpen", initial: false, forceCreation: false, common: { read: true, write: false, name: "Türen im Raum offen?", type: "boolean", role: "state", def: false } }; //
                    DpCount++;
                    States[DpCount] = { id: praefix + room + ".RoomIsOpen", initial: false, forceCreation: false, common: { read: true, write: false, name: "Raum offen?", type: "boolean", role: "state", def: false } }; //
                    DpCount++;
                    States[DpCount] = { id: praefix + room + ".VentWarnTime", initial: 0, forceCreation: false, common: { read: true, write: true, name: "Anzahl der Tage nach der eine Lüftungsempfehlung erzeugt wird", unit: "Tage", type: "number", role: "state", def: 0 } };
                    DpCount++;
                    //log(Funktion + ': ' + room);
                    RoomList[z] = room;
                    RoomOpenCount[z] = 0; // Array mit 0 initialisieren
                    RoomOpenDoorCount[z] = 0; // Array mit 0 initialisieren
                    RoomTiltedDoorCount[z] = 0; // Array mit 0 initialisieren
                    RoomOpenWindowCount[z] = 0; // Array mit 0 initialisieren
                    RoomTiltedWindowCount[z] = 0; // Array mit 0 initialisieren
                    RoomWindowMsgCount[z] = 0;
                    RoomDoorMsgCount[z] = 0;
                    WindowWarnRuntime[z] = 0; // Array mit 0 initialisieren
                    DoorWarnRuntime[z] = 0; // Array mit 0 initialisieren
                    RoomsWithCombinedOpenings[z] = []; //Zweite Dimension für jeden Raum initialisieren
                    z++;
                };

                let TempIndex = RoomList.indexOf(room);
                if (Funktion == WhichWindowFunctionToUse) { //Fenster
                    if (typeof RoomHas[TempIndex] == "undefined") { //Für Raum festlegen ob Türen und/oder Fenster überwacht werden. Steuert ein/aus-blenden der Tabellenbilder
                        RoomHas[TempIndex] = 2; // 0=Weder Tür noch Fenster, 1 Tür, 2 Fenster, 3 Tür und Fenster
                    }
                    else if (RoomHas[TempIndex] == 1) {
                        RoomHas[TempIndex] = 3;
                    };
                    SensorType[SensorCount] = "Window";
                } else if (Funktion == WhichDoorFunctionToUse) { //Tür
                    if (typeof RoomHas[TempIndex] == "undefined") { //Für Raum festlegen ob Türen und/oder Fenster überwacht werden. Steuert ein/aus-blenden der Tabellenbilder
                        RoomHas[TempIndex] = 1; // 0=Weder Tür noch Fenster, 1=Tür, 2=Fenster, 3=Tür+Fenster
                    }
                    else if (RoomHas[TempIndex] == 2) {
                        RoomHas[TempIndex] = 3;
                    };
                    SensorType[SensorCount] = "Door";
                };
                if (logging) {
                    if (RoomHas[TempIndex] == 1) log("Raum- " + TempIndex + " = " + RoomList[TempIndex] + " hat Türsensor/en");
                    if (RoomHas[TempIndex] == 2) log("Raum- " + TempIndex + " = " + RoomList[TempIndex] + " hat Fenstersensor/en");
                    if (RoomHas[TempIndex] == 3) log("Raum- " + TempIndex + " = " + RoomList[TempIndex] + " hat Tür- und Fenstersensor/en");
                };

                //log("Sensor " + SensorCount + " in " + room + " =" + Sensor[SensorCount] + " SensorType[y]=" + SensorType[SensorCount] + " x=" + x + " Funktion=" + Funktion);
                SensorCount++;
            };
        };
    };
};

//Struktur anlegen in js.0 um Sollwert und Summenergebniss zu speichern
//Generische Datenpunkte vorbereiten 
States[DpCount] = { id: praefix + "AllWindowsClosed", initial: true, forceCreation: false, common: { read: true, write: false, name: "Sind aktuell alle Fenster geschlossen?", type: "boolean", role: "state", def: true } }; //
DpCount++;
States[DpCount] = { id: praefix + "AllDoorsClosed", initial: true, forceCreation: false, common: { read: true, write: false, name: "Sind aktuell alle Türen geschlossen?", type: "boolean", role: "state", def: true } }; //
DpCount++;
States[DpCount] = { id: praefix + "WindowsOpen", initial: 0, forceCreation: false, common: { read: true, write: false, name: "Anzahl der geöffneten Fenster", type: "number", def: 0 } };
DpCount++;
States[DpCount] = { id: praefix + "DoorsOpen", initial: 0, forceCreation: false, common: { read: true, write: false, name: "Anzahl der geöffneten Türen", type: "number", def: 0 } };
DpCount++;
States[DpCount] = { id: praefix + "WindowsTilted", initial: 0, forceCreation: false, common: { read: true, write: false, name: "Anzahl der gekippten Fenster", type: "number", def: 0 } };
DpCount++;
States[DpCount] = { id: praefix + "DoorsTilted", initial: 0, forceCreation: false, common: { read: true, write: false, name: "Anzahl der gekippten Türen", type: "number", def: 0 } };
DpCount++;
States[DpCount] = { id: praefix + "RoomsWithOpenings", initial: "", forceCreation: false, common: { read: true, write: false, name: "In welchen Räumen sind Türen/Fenster geöffnet?", type: "string", def: "" } };
DpCount++;
States[DpCount] = { id: praefix + "RoomsWithOpenDoors", initial: "", forceCreation: false, common: { read: true, write: false, name: "In welchen Räumen sind Türen geöffnet?", type: "string", def: "" } };
DpCount++;
States[DpCount] = { id: praefix + "RoomsWithTiltedDoors", initial: "", forceCreation: false, common: { read: true, write: false, name: "In welchen Räumen sind Türen gekippt?", type: "string", def: "" } };
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
            InitialSort();
        };
    });
});

function InitialSort() {
    let TempRoomHas = [];
    let TempRoomList = [];
    let AlphabeticalSortedRoomList = RoomList.join(","); //Raumliste zu kommaseparierten String wndeln
    let OrderPriority;
    TempRoomList = AlphabeticalSortedRoomList.split(","); //String wieder zurück zu Array wandeln
    AlphabeticalSortedRoomList = TempRoomList.sort(); //Array sortieren

    if (RoomSortMode == 1) { //Raumliste sortieren //alphabetisch
        for (let x = 0; x < RoomList.length; x++) { //Raum Dps durchlaufen
            OrderPriority = AlphabeticalSortedRoomList.indexOf(RoomList[x]);
            TempRoomList[OrderPriority] = RoomList[x];
            TempRoomHas[OrderPriority] = RoomHas[x];
        };
        RoomList = TempRoomList;
        RoomHas = TempRoomHas;
    }
    else if (RoomSortMode == 2) {//benutzerdefiniert
        for (let x = 0; x < RoomList.length; x++) { //Raum Dps durchlaufen
            OrderPriority = getState(praefix + RoomList[x] + ".RoomOrderPriority").val; //benutzdefinierte Reihenfolge lesen
            TempRoomList[OrderPriority] = RoomList[x]; //und an entsprechende Stelle schreiben
            TempRoomHas[OrderPriority] = RoomHas[x]; //RoomHas synchron halten
        };
        RoomList = TempRoomList;
        RoomHas = TempRoomHas;
    };
    //log(RoomList);
    //log(TempRoomList);
    //log(RoomHas);
    //log(TempRoomHas);
    //log(AlphabeticalSortedRoomList);
    main();
}

function init() {
    MessageLog = getState(praefix + "MessageLog").val;
    MuteMode = getState(praefix + "MuteMode").val;
    if (PresenceDp != "") Presence = getState(PresenceDp).val;

    for (let x = 0; x < RoomList.length; x++) { //Messaging DPs einlesen
        SendVentMsg[x] = getState(praefix + RoomList[x] + ".SendVentMsg").val;
        SendDoorOpenCloseMsg[x] = getState(praefix + RoomList[x] + ".SendDoorOpenCloseMsg").val;
        SendWindowOpenCloseMsg[x] = getState(praefix + RoomList[x] + ".SendWindowOpenCloseMsg").val;
        SendWindowWarnMsg[x] = getState(praefix + RoomList[x] + ".SendWindowWarnMsg").val;
        SendDoorWarnMsg[x] = getState(praefix + RoomList[x] + ".SendDoorWarnMsg").val;
        if (logging) log("x=" + x + "=" + RoomList[x] + " SendWindowWarnMsg=" + SendWindowWarnMsg[x] + " SendDoorWarnMsg=" + SendDoorWarnMsg[x] + " SendVentMsg=" + SendVentMsg[x] + " SendWindowOpenCloseMsg=" + SendWindowOpenCloseMsg[x] + " SendDoorOpenCloseMsg=" + SendDoorOpenCloseMsg[x]);
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
        VentCheck(x);
    };
    IsInit = false;
}

function main() {
    init(); //Bei Scriptstart alle Sensoren und Räume einlesen
    CreateTrigger(); //Trigger erstellen
    CreateRoomsWithOpenDoorsList(); //Übersichtsliste mit Räumen mit offenen Türen erstellen
    CreateRoomsWithTiltedDoorsList(); //Übersichtsliste mit Räumen mit offenen Türen erstellen
    CreateRoomsWithOpenWindowsList(); //Übersichtsliste mit Räumen mit offenen Fenstern erstellen
    CreateRoomsWithTiltedWindowsList(); //Übersichtsliste mit Räumen mit gekippten Fenstern erstellen
    CreateRoomsWithOpeningsList();//Übersichtsliste mit Räumen mit offenen Fenstern und Türen erstellen
    CreateRoomsWithVentWarnings();//Übersichtsliste mit Räumen mit Lüftungswarnung erstellen
    CreateOverviewTable(); //HTML Tabelle erstellen
    Ticker(); //Minutenticker für Tabellenrefresh starten
}

function Meldung(msg) {
    if (logging) log("Reaching Meldung, msg= " + msg + " NoMsgAtPresence= " + NoMsgAtPresence + " Presence= " + Presence);

    if (NoMsgAtPresence && Presence) {
        if (logging) log("Meldung blocked cause, NoMsgAtPresence= " + NoMsgAtPresence + " Presence= " + Presence);
    }
    else {
        if (MuteMode != 1 && MuteMode != 2) {
            if (UseSay) Say(msg);

            if (UseAlexa) {
                if (AlexaId != "") setState(AlexaInstance + ".Echo-Devices." + AlexaId + ".Commands.announcement"/*announcement*/, AlexaVolume + "; " + msg);
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

            if (UsePushover) {
                sendTo(PushOverInstance, "send", {
                    device: PushOverDevice, message: msg, title: PushOverTitle, sound: PushOverSound
                });
            };

            if (UseMail) {
                sendTo("email", {
                    html: msg
                });
            };
        }
        setState(praefix + "LastMessage", msg, true);
        WriteMessageLog(msg);
    };
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
    // log("TempMessageLog=" + TempMessageLog + " Logentrys=" + LogEntrys);
    MessageLog = TempMessageLog.join(LogEntrySeparator); //Array zu String wandeln und Separator anhängen
    setState(praefix + "MessageLog", MessageLog,true); //Logstring schreiben
}

function CreateOverviewTable() { //  Erzeugt tabellarische Übersicht als HTML Tabelle   
    let OverviewTable = "";
    let TableSubString = [];
    TableSubString[0] = "<td style='border: 1px solid black; background-color:";
    TableSubString[1] = ";'><img style='margin: auto; display: block; filter: invert(";
    //TableSubString[2] = ";'><img style='margin: auto; display: block; opacity: 0.2; filter: invert(";
    TableSubString[3] = "<td colspan='2' style='border: 1px solid black; background-color:";

    TableSubString[5] = "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; font-size:16px; font-weight: bold; text-align:center;background-color:";
    TableSubString[6] = "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; padding-top: 4px; font-size: 16px; font-weight: bold; background-color:";
    //Überschrift
    if (ShowCaptionTbl) {
        OverviewTable += "<table style='width:100%; border-collapse: collapse; border: 0px solid black;'><tr><td style='height: 20px; text-align:center; padding-top: 5px; font-size:20px; font-weight: bold;'>Fensterstatus</td></tr></table>"
    };
    //Zusammenfassung
    if (ShowSummaryTbl) {
        OverviewTable += "<table style='width:100%; border-collapse: collapse; border: 0px solid black;'><tr><td style='height: 20px; text-align:center; padding-top: 5px; padding-bottom: 5px; font-size:14px; font-weight: normal;'>" + RoomsWithOpenings + "</td></tr></table>";
    };

    // Details / Head
    if (ShowDetailTbl) {
        OverviewTable += "<table style='width:100%; border-collapse: collapse;'>";
        OverviewTable += "<thead><tr>";
        OverviewTable += "<th width='40px' style='text-align:left;'</th>";
        OverviewTable += "<th width='40px' style='text-align:left;'</th>";
        OverviewTable += "<th width='20px' style='text-align:center;'></th><th style='text-align:left;'></th></tr></thead><tbody>";
        //Tabelle der Raumdetails
        for (let x = 0; x < RoomList.length; x++) { //Alle Räume durchgehen
            OverviewTable += "<tr>";
            RoomStateTimeCount[x] = CalcTimeDiff("now", RoomStateTimeStamp[x]);
            RoomDoorStateTimeCount[x] = CalcTimeDiff("now", RoomDoorStateTimeStamp[x]);
            //log("x=" + x + " Raum = "+RoomList[x] + " RoomStateTimeCount[x] = "+CreateTimeString(RoomStateTimeCount[x]) +" RoomDoorStateTimeCount[x] = "+CreateTimeString(RoomDoorStateTimeCount[x]))
            if (RoomOpenWindowCount[x] > 0 || RoomOpenDoorCount[x] > 0) { // Räume mit offenen Fenstern oder Türen

                if (RoomTiltedWindowCount[x] == 0 && RoomOpenWindowCount[x] > 0 && RoomOpenDoorCount[x] == 0) { //Fenster ist offen, keines ist gekippt, Tür/en sind geschlossen
                    if (RoomHas[x] == 2) {        //RoomHas[] 1=Tür, 2=Fenster, 3=Tür+Fenster
                        OverviewTable += TableSubString[3] + OpenWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowOpenImg + "'></td>";
                    } else if (RoomHas[x] == 1) {
                        OverviewTable += TableSubString[3] + ClosedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorCloseImg + "'></td>";

                    } else {
                        OverviewTable += TableSubString[0] + OpenWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowOpenImg + "'></td>";
                        OverviewTable += TableSubString[0] + ClosedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorCloseImg + "'></td>";
                    };

                    OverviewTable += TableSubString[5] + OpenWindowColor + ";'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += RoomOpenWindowCount[x] + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += RoomOpenDoorCount[x];
                    OverviewTable += "</td>";

                    OverviewTable += TableSubString[6] + OpenWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:bold;'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += "Fenster geöffnet: " + CreateTimeString(RoomStateTimeCount[x]) + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += "Tür geschlossen: " + CreateTimeString(RoomDoorStateTimeCount[x]);

                }
                else if (RoomTiltedWindowCount[x] > 0 && RoomTiltedWindowCount[x] == RoomOpenWindowCount[x] && RoomOpenDoorCount[x] == 0) { //Fenster ist gekippt, Tür/en sind geschlossen
                    if (RoomHas[x] == 2) {        //RoomHas[] 0=Weder Tür noch Fenster, 1=Tür, 2=Fenster, 3=Tür+Fenster
                        OverviewTable += TableSubString[3] + TiltedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowTiltedImg + "'></td>";
                    } else if (RoomHas[x] == 1) {
                        OverviewTable += TableSubString[3] + ClosedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorCloseImg + "'></td>";
                    } else {
                        OverviewTable += TableSubString[0] + TiltedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowTiltedImg + "'></td>";
                        OverviewTable += TableSubString[0] + ClosedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorCloseImg + "'></td>";
                    };

                    OverviewTable += TableSubString[5] + TiltedWindowColor + ";'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += RoomOpenWindowCount[x] + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += RoomOpenDoorCount[x];
                    OverviewTable += "</td>";

                    OverviewTable += TableSubString[6] + TiltedWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:bold;'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += "Fenster gekippt:" + CreateTimeString(RoomStateTimeCount[x]) + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += "Tür geschlossen:" + CreateTimeString(RoomDoorStateTimeCount[x]);
                }
                else if (RoomTiltedWindowCount[x] < RoomOpenWindowCount[x] && RoomOpenDoorCount[x] == 0) { // Fenster sind offen und gekippt, Tür/en sind geschlossen
                    if (RoomHas[x] == 2) {        //RoomHas[] 0=Weder Tür noch Fenster, 1=Tür, 2=Fenster, 3=Tür+Fenster
                        OverviewTable += TableSubString[3] + OpenWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowOpenTiltedImg + "'></td>";
                    } else if (RoomHas[x] == 1) {
                        OverviewTable += TableSubString[3] + ClosedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorCloseImg + "'></td>";
                    } else {
                        OverviewTable += TableSubString[0] + OpenWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowOpenTiltedImg + "'></td>";
                        OverviewTable += TableSubString[0] + ClosedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorCloseImg + "'></td>";
                    };

                    OverviewTable += TableSubString[5] + OpenWindowColor + ";'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += RoomOpenWindowCount[x] + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += RoomOpenDoorCount[x];
                    OverviewTable += "</td>";

                    OverviewTable += TableSubString[6] + OpenWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:bold;'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += "Fenster geöffnet/gekippt:" + CreateTimeString(RoomStateTimeCount[x]) + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += "Tür geschlossen: " + CreateTimeString(RoomDoorStateTimeCount[x]);
                }

                //*****************

                if (RoomTiltedDoorCount[x] > 0 && RoomOpenWindowCount[x] == 0) { // Tür/en gekippt, kein Fenster ist geöffnet
                    if (RoomHas[x] == 2) {        //RoomHas[] 1=Tür, 2=Fenster, 3=Tür+Fenster
                        OverviewTable += TableSubString[3] + ClosedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowCloseImg + "'></td>";
                    } else if (RoomHas[x] == 1) {
                        OverviewTable += TableSubString[3] + TiltedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorTiltedImg + "'></td>";
                    } else {
                        OverviewTable += TableSubString[0] + ClosedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowCloseImg + "'></td>";
                        OverviewTable += TableSubString[0] + TiltedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorTiltedImg + "'></td>";
                    };

                    OverviewTable += TableSubString[5] + OpenDoorColor + ";'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += RoomOpenWindowCount[x] + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += RoomOpenDoorCount[x];
                    OverviewTable += "</td>";

                    OverviewTable += TableSubString[6] + OpenDoorColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:bold;'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += "Fenster geschlossen: " + CreateTimeString(RoomStateTimeCount[x]) + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += "Tür gekippt: " + CreateTimeString(RoomDoorStateTimeCount[x]);
                }
                else if (RoomOpenWindowCount[x] > 0 && RoomTiltedWindowCount[x] == 0 && RoomTiltedDoorCount[x] > 0) { //Fenster ist offen, keines ist gekippt, Tür/en sind gekippt
                    if (RoomHas[x] == 2) {        //RoomHas[] 1=Tür, 2=Fenster, 3=Tür+Fenster
                        OverviewTable += TableSubString[3] + OpenWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowOpenImg + "'></td>";
                    } else if (RoomHas[x] == 1) {
                        OverviewTable += TableSubString[3] + TiltedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorTiltedImg + "'></td>";
                    } else {
                        OverviewTable += TableSubString[0] + OpenWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowOpenImg + "'></td>";
                        OverviewTable += TableSubString[0] + TiltedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorTiltedImg + "'></td>";
                    };

                    OverviewTable += TableSubString[5] + OpenWindowColor + ";'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += RoomOpenWindowCount[x] + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += RoomOpenDoorCount[x];
                    OverviewTable += "</td>";

                    OverviewTable += TableSubString[6] + OpenWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:bold;'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += "Fenster geöffnet: " + CreateTimeString(RoomStateTimeCount[x]) + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += "Tür gekippt: " + CreateTimeString(RoomDoorStateTimeCount[x]);
                }
                else if (RoomTiltedWindowCount[x] > 0 && RoomTiltedWindowCount[x] == RoomOpenWindowCount[x] && RoomTiltedDoorCount[x] > 0) { //Fenster ist gekippt, Tür/en sind gekippt
                    if (RoomHas[x] == 2) {        //RoomHas[] 0=Weder Tür noch Fenster, 1=Tür, 2=Fenster, 3=Tür+Fenster
                        OverviewTable += TableSubString[3] + TiltedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowTiltedImg + "'></td>";
                    } else if (RoomHas[x] == 1) {
                        OverviewTable += TableSubString[3] + TiltedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorTiltedImg + "'></td>";
                    } else {
                        OverviewTable += TableSubString[0] + TiltedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowTiltedImg + "'></td>";
                        OverviewTable += TableSubString[0] + TiltedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorTiltedImg + "'></td>";
                    };

                    OverviewTable += TableSubString[5] + TiltedWindowColor + ";'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += RoomOpenWindowCount[x] + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += RoomOpenDoorCount[x];
                    OverviewTable += "</td>";

                    OverviewTable += TableSubString[6] + TiltedWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:bold;'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += "Fenster gekippt: " + CreateTimeString(RoomStateTimeCount[x]) + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += "Tür gekippt: " + CreateTimeString(RoomDoorStateTimeCount[x]);
                }
                else if (RoomOpenWindowCount[x] > 0 && RoomTiltedWindowCount[x] < RoomOpenWindowCount[x] && RoomTiltedDoorCount[x] > 0) { // Fenster sind offen und gekippt, Tür/en sind gekippt
                    if (RoomHas[x] == 2) {        //RoomHas[] 0=Weder Tür noch Fenster, 1=Tür, 2=Fenster, 3=Tür+Fenster
                        OverviewTable += TableSubString[3] + OpenWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowOpenTiltedImg + "'></td>";
                    } else if (RoomHas[x] == 1) {
                        OverviewTable += TableSubString[3] + TiltedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorTiltedImg + "'></td>";
                    } else {
                        OverviewTable += TableSubString[0] + OpenWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowOpenTiltedImg + "'></td>";
                        OverviewTable += TableSubString[0] + TiltedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorTiltedImg + "'></td>";
                    };

                    OverviewTable += TableSubString[5] + OpenWindowColor + ";'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += RoomOpenWindowCount[x] + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += RoomOpenDoorCount[x];
                    OverviewTable += "</td>";

                    OverviewTable += TableSubString[6] + OpenWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:bold;'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += "Fenster geöffnet/gekippt: " + CreateTimeString(RoomStateTimeCount[x]) + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += "Tür gekippt: " + CreateTimeString(RoomDoorStateTimeCount[x]);
                }

                //*******************/
                else if (RoomOpenDoorCount[x] > 0 && RoomOpenWindowCount[x] == 0) { // Tür/en geöffnet, kein Fenster ist geöffnet
                    if (RoomHas[x] == 2) {        //RoomHas[] 0=Weder Tür noch Fenster, 1=Tür, 2=Fenster, 3=Tür+Fenster
                        OverviewTable += TableSubString[3] + ClosedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowCloseImg + "'></td>";
                    } else if (RoomHas[x] == 1) {
                        OverviewTable += TableSubString[3] + OpenDoorColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorOpenImg + "'></td>";
                    } else {
                        OverviewTable += TableSubString[0] + ClosedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowCloseImg + "'></td>";
                        OverviewTable += TableSubString[0] + OpenDoorColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorOpenImg + "'></td>";
                    };

                    OverviewTable += TableSubString[5] + OpenDoorColor + ";'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += RoomOpenWindowCount[x] + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += RoomOpenDoorCount[x];
                    OverviewTable += "</td>";

                    OverviewTable += TableSubString[6] + OpenDoorColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:bold;'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += "Fenster geschlossen: " + CreateTimeString(RoomStateTimeCount[x]) + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += "Tür geöffnet: " + CreateTimeString(RoomDoorStateTimeCount[x]);
                }
                else if (RoomOpenWindowCount[x] > 0 && RoomTiltedWindowCount[x] == 0 && RoomOpenDoorCount[x] > 0) { //Fenster ist offen, keines ist gekippt, Tür/en sind geöffnet
                    if (RoomHas[x] == 2) {        //RoomHas[] 0=Weder Tür noch Fenster, 1=Tür, 2=Fenster, 3=Tür+Fenster
                        OverviewTable += TableSubString[3] + OpenWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowOpenImg + "'></td>";
                    } else if (RoomHas[x] == 1) {
                        OverviewTable += TableSubString[3] + OpenDoorColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorOpenImg + "'></td>";
                    } else {
                        OverviewTable += TableSubString[0] + OpenWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowOpenImg + "'></td>";
                        OverviewTable += TableSubString[0] + OpenDoorColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorOpenImg + "'></td>";
                    };

                    OverviewTable += TableSubString[5] + OpenWindowColor + ";'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += RoomOpenWindowCount[x] + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += RoomOpenDoorCount[x];
                    OverviewTable += "</td>";

                    OverviewTable += TableSubString[6] + OpenWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:bold;'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += "Fenster geöffnet: " + CreateTimeString(RoomStateTimeCount[x]) + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += "Tür geöffnet: " + CreateTimeString(RoomDoorStateTimeCount[x]);
                }
                else if (RoomTiltedWindowCount[x] > 0 && RoomTiltedWindowCount[x] == RoomOpenWindowCount[x] && RoomOpenDoorCount[x] > 0) { //Fenster ist gekippt, Tür/en sind geöffnet
                    if (RoomHas[x] == 2) {        //RoomHas[] 0=Weder Tür noch Fenster, 1=Tür, 2=Fenster, 3=Tür+Fenster
                        OverviewTable += TableSubString[3] + TiltedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowTiltedImg + "'></td>";
                    } else if (RoomHas[x] == 1) {
                        OverviewTable += TableSubString[3] + OpenDoorColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorOpenImg + "'></td>";
                    } else {
                        OverviewTable += TableSubString[0] + TiltedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowTiltedImg + "'></td>";
                        OverviewTable += TableSubString[0] + OpenDoorColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorOpenImg + "'></td>";
                    };

                    OverviewTable += TableSubString[5] + TiltedWindowColor + ";'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += RoomOpenWindowCount[x] + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += RoomOpenDoorCount[x];
                    OverviewTable += "</td>";

                    OverviewTable += TableSubString[6] + TiltedWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:bold;'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += "Fenster gekippt: " + CreateTimeString(RoomStateTimeCount[x]) + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += "Tür geöffnet: " + CreateTimeString(RoomDoorStateTimeCount[x]);
                }
                else if (RoomOpenWindowCount[x] > 0 && RoomTiltedWindowCount[x] < RoomOpenWindowCount[x] && RoomOpenDoorCount[x] > 0) { // Fenster sind offen und gekippt, Tür/en sind geöffnet
                    if (RoomHas[x] == 2) {        //RoomHas[] 0=Weder Tür noch Fenster, 1=Tür, 2=Fenster, 3=Tür+Fenster
                        OverviewTable += TableSubString[3] + OpenWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowOpenTiltedImg + "'></td>";
                    } else if (RoomHas[x] == 1) {
                        OverviewTable += TableSubString[3] + OpenDoorColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorOpenImg + "'></td>";
                    } else {
                        OverviewTable += TableSubString[0] + OpenWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + WindowOpenTiltedImg + "'></td>";
                        OverviewTable += TableSubString[0] + OpenDoorColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorOpenImg + "'></td>";
                    };

                    OverviewTable += TableSubString[5] + OpenWindowColor + ";'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += RoomOpenWindowCount[x] + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += RoomOpenDoorCount[x];
                    OverviewTable += "</td>";

                    OverviewTable += TableSubString[6] + OpenWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:bold;'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += "Fenster geöffnet/gekippt: " + CreateTimeString(RoomStateTimeCount[x]) + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += "Tür geöffnet: " + CreateTimeString(RoomDoorStateTimeCount[x]);
                }

                OverviewTable += "</td></tr>";
            }
            else { // Geschlossene Räume

                if (VentMsg[x] == "") { //geschlossen + keine Lüftungswarnung
                    if (RoomHas[x] == 2) {        //RoomHas[] 0=Weder Tür noch Fenster, 1=Tür, 2=Fenster, 3=Tür+Fenster
                        OverviewTable += TableSubString[3] + ClosedWindowColor + ";'><img style=' margin: auto; display: block; filter: invert(" + ImgInvert + "); height: 40px;'  src='" + WindowCloseImg + "'></td>";
                    } else if (RoomHas[x] == 1) {
                        OverviewTable += TableSubString[3] + ClosedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorCloseImg + "'></td>";
                    } else {
                        OverviewTable += TableSubString[0] + ClosedWindowColor + ";'><img style=' margin: auto; display: block; filter: invert(" + ImgInvert + "); height: 40px;'  src='" + WindowCloseImg + "'></td>";
                        OverviewTable += TableSubString[0] + ClosedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorCloseImg + "'></td>";
                    };

                    OverviewTable += "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; font-size:16px; font-weight: bold; text-align:center; background-color:" + ClosedWindowColor + ";'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += RoomOpenWindowCount[x] + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += RoomOpenDoorCount[x];
                    OverviewTable += "</td>";


                    if (RoomHas[x] == 2) OverviewTable += TableSubString[6] + ClosedWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:normal;'>Fenster geschlossen: " + CreateTimeString(RoomStateTimeCount[x]) + "<br>";
                    if (RoomHas[x] == 1) OverviewTable += TableSubString[6] + ClosedWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:normal;'>Tür geschlossen: " + CreateTimeString(RoomDoorStateTimeCount[x]);
                    if (RoomHas[x] == 3) OverviewTable += TableSubString[6] + ClosedWindowColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:normal;'>Fenster geschlossen: " + CreateTimeString(RoomStateTimeCount[x]) + "<br><div style='font-size:12px; font-weight:normal;'>Tür geschlossen: " + CreateTimeString(RoomDoorStateTimeCount[x]);

                    OverviewTable += "</div></td></tr>"
                }
                else { //geschlossen + Lüftungswarnung
                    if (RoomHas[x] == 2) {        //RoomHas[] 0=Weder Tür noch Fenster, 1=Tür, 2=Fenster, 3=Tür+Fenster
                        OverviewTable += TableSubString[3] + VentWarnColor + ";'><img style=' margin: auto; display: block; filter: invert(" + ImgInvert + "); height: 40px;'  src='" + VentImg + "'></td>";
                    } else if (RoomHas[x] == 1) {
                        OverviewTable += TableSubString[3] + ClosedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorOpenImg + "'></td>";
                    } else {
                        OverviewTable += TableSubString[0] + VentWarnColor + ";'><img style=' margin: auto; display: block; filter: invert(" + ImgInvert + "); height: 40px;'  src='" + VentImg + "'></td>";
                        OverviewTable += TableSubString[0] + ClosedWindowColor + TableSubString[1] + ImgInvert + "); height: 40px;' src='" + DoorOpenImg + "'></td>";
                    };

                    OverviewTable += "<td style='border: 1px solid black; padding-left: 10px; padding-right: 10px; font-size:16px; font-weight: bold; text-align:center; background-color:" + VentWarnColor + ";'>";
                    if (RoomHas[x] == 2 || RoomHas[x] == 3) OverviewTable += RoomOpenWindowCount[x] + "<br>";
                    if (RoomHas[x] == 1 || RoomHas[x] == 3) OverviewTable += RoomOpenDoorCount[x];
                    OverviewTable += "</td>";

                    OverviewTable += TableSubString[6] + VentWarnColor + ";'>" + ReplaceChars(RoomList[x]) + "<br><div style='font-size:12px; font-weight:bold;'>Raum nicht gelüftet: " + CreateTimeString(RoomStateTimeCount[x]);
                    OverviewTable += "</div></td></tr>";
                };
            };
        };
        OverviewTable += "</tbody></table>";
    };
    setState(praefix + "OverviewTable", OverviewTable, true);
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
    //log(typeof OrigString)
    if (typeof OrigString == "undefined") OrigString = "";
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
        //RoomsWithCombinedOpenings[x] = [];

        if (RoomOpenWindowCount[x] > 0) { // Nur Räume mit offenen Fenstern berücksichtigen
            if (RoomOpenWindowCount[x] == 1) { //Wenn 1 Fenster offen, Singular Schreibweise
                if (RoomTiltedWindowCount[x] == 1) { //Wenn das eine Fenster gekippt ist
                    RoomsWithOpenWindows += ReplaceChars(RoomList[x]) + " " + RoomOpenWindowCount[x] + " gekipptes Fenster" + OpenWindowListSeparator;
                    RoomsWithCombinedOpenings[x][0] = RoomOpenWindowCount[x] + " gekipptes Fenster";
                }
                else {
                    RoomsWithOpenWindows += ReplaceChars(RoomList[x]) + " " + RoomOpenWindowCount[x] + " offenes Fenster" + OpenWindowListSeparator;
                    RoomsWithCombinedOpenings[x][0] = RoomOpenWindowCount[x] + " offenes Fenster";
                };
            }
            else { //ansonsten Plural Schreibweise
                if (RoomTiltedWindowCount[x] == RoomOpenWindowCount[x]) { //Wenn gekippte Fenster = offene Fenster 
                    RoomsWithOpenWindows += RoomTiltedWindowCount[x] + " gekippte Fenster" + OpenWindowListSeparator;
                    RoomsWithCombinedOpenings[x][0] = RoomOpenWindowCount[x] + " gekippte Fenster";
                }
                else {
                    RoomsWithOpenWindows += ReplaceChars(RoomList[x]) + " " + RoomOpenWindowCount[x] + " offene Fenster" + OpenWindowListSeparator;
                    RoomList[x][0] = RoomOpenWindowCount[x] + " offene Fenster";
                    RoomsWithCombinedOpenings[x][0] = RoomOpenWindowCount[x] + " offene Fenster";
                    if (RoomTiltedWindowCount[x] == 1) { //Wenn 1 Fenster gekippt Singular schreibweise
                        RoomsWithOpenWindows += " davon " + RoomTiltedWindowCount[x] + " gekipptes Fenster" + OpenWindowListSeparator;
                        RoomsWithCombinedOpenings[x][0] = RoomOpenWindowCount[x] + " offene Fenster," + " davon " + RoomTiltedWindowCount[x] + " gekipptes Fenster";

                    }
                    else if (RoomTiltedWindowCount[x] > 1) { //ansonsten Plural Schreibweise
                        RoomsWithOpenWindows += " davon " + RoomTiltedWindowCount[x] + " gekippte Fenster" + OpenWindowListSeparator;
                        RoomsWithCombinedOpenings[x][0] = RoomOpenWindowCount[x] + " offene Fenster," + " davon " + RoomTiltedWindowCount[x] + " gekippte Fenster";
                    };
                };
            };
        } else {
            RoomsWithCombinedOpenings[x][0] = "Alle Fenster sind geschlossen";
        };
    };
    RoomsWithOpenWindows = RoomsWithOpenWindows.substr(0, RoomsWithOpenWindows.length - OpenWindowListSeparator.length); //letzten <br> Umbruch wieder entfernen

    if (RoomsWithOpenWindows == "") {
        RoomsWithOpenWindows = "Alle Fenster sind geschlossen";

    };
    setState(praefix + "RoomsWithOpenWindows", RoomsWithOpenWindows, true);
    if (logging) log("RoomsWithOpenWindows: " + RoomsWithOpenWindows);
}

function CreateRoomsWithTiltedWindowsList() { //Erzeugt Textliste mit Räumen welche gekippte Fenster haben
    if (logging) log("Reaching CreateRoomsWithTiltedWindowsList");
    RoomsWithTiltedWindows = ""; //Liste Initialisieren
    for (let x = 0; x < RoomList.length; x++) { //Alle Räume durchgehen
        if (RoomTiltedWindowCount[x] > 0) { // Nur Räume mit gekippten Fenstern berücksichtigen
            if (RoomTiltedWindowCount[x] == 1) { //Wenn 1 Fenster gekippt, Singular Schreibweise
                RoomsWithTiltedWindows += ReplaceChars(RoomList[x]) + " " + RoomTiltedWindowCount[x] + " gekipptes Fenster" + OpenWindowListSeparator;
            }
            else { //ansonsten Plural Schreibweise
                RoomsWithTiltedWindows += ReplaceChars(RoomList[x]) + " " + RoomOpenWindowCount[x] + " gekippte Fenster" + OpenWindowListSeparator;
            };
        };
    };
    RoomsWithTiltedWindows = RoomsWithTiltedWindows.substr(0, RoomsWithTiltedWindows.length - OpenWindowListSeparator.length); //letzten <br> Umbruch wieder entfernen

    if (RoomsWithTiltedWindows == "") {
        RoomsWithTiltedWindows = "Keine Fenster gekippt";
    };
    setState(praefix + "RoomsWithTiltedWindows", RoomsWithTiltedWindows, true);
    if (logging) log("RoomsWithTiltedWindows: " + RoomsWithTiltedWindows);
}

function CreateRoomsWithOpenDoorsList() { //Erzeugt Textliste mit Räumen welche offene Türen haben
    if (logging) log("Reaching CreateRoomsWithOpenDoorsList");
    RoomsWithOpenDoors = ""; //Liste Initialisieren
    for (let x = 0; x < RoomList.length; x++) { //Alle Räume durchgehen
        //RoomsWithCombinedOpenings[x] = [];

        if (RoomOpenDoorCount[x] > 0) { // Nur Räume mit offenen Türen berücksichtigen

            if (RoomOpenDoorCount[x] == 1) { //Wenn 1 Tür offen, Singular Schreibweise
                RoomsWithOpenDoors += ReplaceChars(RoomList[x]) + " " + RoomOpenDoorCount[x] + " offene Tür" + OpenWindowListSeparator;
                RoomsWithCombinedOpenings[x][1] = RoomOpenDoorCount[x] + " offene Tür";

            }
            else { //ansonsten Plural Schreibweise
                RoomsWithOpenDoors += ReplaceChars(RoomList[x]) + " " + RoomOpenDoorCount[x] + " offene Türen" + OpenWindowListSeparator;
                RoomsWithCombinedOpenings[x][1] = RoomOpenDoorCount[x] + " offene Türen";
            };
        } else {
            RoomsWithCombinedOpenings[x][1] = "Keine Tür/en geöffnet";
        };
    };
    RoomsWithOpenDoors = RoomsWithOpenDoors.substr(0, RoomsWithOpenDoors.length - OpenWindowListSeparator.length); //letzten <br> Umbruch wieder entfernen

    if (RoomsWithOpenDoors == "") {
        RoomsWithOpenDoors = "Keine Tür/en geöffnet";
    };
    setState(praefix + "RoomsWithOpenDoors", RoomsWithOpenDoors, true);
    if (logging) log("RoomsWithOpenDoors: " + RoomsWithOpenDoors);
}

function CreateRoomsWithTiltedDoorsList() { //Erzeugt Textliste mit Räumen welche gekippte Türen haben
    if (logging) log("Reaching CreateRoomsWithTiltedDoorsList");
    RoomsWithTiltedDoors = ""; //Liste Initialisieren
    for (let x = 0; x < RoomList.length; x++) { //Alle Räume durchgehen
        if (RoomTiltedDoorCount[x] > 0) { // Nur Räume mit gekippten Türen berücksichtigen
            if (RoomTiltedDoorCount[x] == 1) { //Wenn 1 Tür gekippt, Singular Schreibweise
                RoomsWithTiltedDoors += ReplaceChars(RoomList[x]) + " " + RoomTiltedDoorCount[x] + " gekippte Tür" + OpenWindowListSeparator;
            }
            else { //ansonsten Plural Schreibweise
                RoomsWithTiltedDoors += ReplaceChars(RoomList[x]) + " " + RoomTiltedDoorCount[x] + " gekippte Türen" + OpenWindowListSeparator;
            };
        };
    };
    RoomsWithTiltedDoors = RoomsWithTiltedDoors.substr(0, RoomsWithTiltedDoors.length - OpenWindowListSeparator.length); //letzten <br> Umbruch wieder entfernen

    if (RoomsWithTiltedDoors == "") {
        RoomsWithTiltedDoors = "Keine Tür gekippt";
    };
    setState(praefix + "RoomsWithTiltedDoors", RoomsWithTiltedDoors, true);
    if (logging) log("RoomsWithTiltedDoors: " + RoomsWithTiltedDoors);
}

function CreateRoomsWithOpeningsList() { //Erzeugt Textliste mit Räumen welche offene Türen und/oder Fenster haben
    if (logging) log("CreateOpenRoomsList()");
    RoomsWithOpenings = "";
    for (let x = 0; x < RoomList.length; x++) { //Alle Räume durchgehen
        if (RoomOpenWindowCount[x] == 0 && RoomOpenDoorCount[x] > 0) {
            RoomsWithOpenings += ReplaceChars(RoomList[x]) + " " + RoomsWithCombinedOpenings[x][1] + OpenWindowListSeparator;
        }
        else if (RoomOpenWindowCount[x] > 0 && RoomOpenDoorCount[x] == 0) {
            RoomsWithOpenings += ReplaceChars(RoomList[x]) + " " + RoomsWithCombinedOpenings[x][0] + OpenWindowListSeparator;
        }
        else if (RoomOpenWindowCount[x] > 0 && RoomOpenDoorCount[x] > 0) {
            RoomsWithOpenings += ReplaceChars(RoomList[x]) + " " + RoomsWithCombinedOpenings[x].join(", ") + OpenWindowListSeparator;
        }
    };
    setState(praefix + "RoomsWithOpenings", RoomsWithOpenings, true);
    if (logging) log("RoomsWithOpenings: " + RoomsWithOpenings);
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
    setState(praefix + "RoomsWithVentWarnings", Tempstring, true);
}

function VentCheck(x) { //Überprüft wie lange Räume geschlossen sind und gibt Lüftungswarnung aus
    if (logging) log("Reaching VentCheck x=" + x + " Init=" + IsInit + " VentwarnTime[x]=" + VentWarnTime[x] + " RoomStateTimeStamp[x]=" + RoomStateTimeStamp[x]);
    if (RoomOpenWindowCount[x] == 0 && VentWarnTime[x] != 0) { //VentTimeout starten wenn alle Fenster im Raum geschlossen und Warnzeit nicht 0 (= deaktiviert) 
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
    else if (RoomOpenWindowCount[x] != 0 || VentWarnTime[x] == 0) {
        if (logging) log("Room " + x + " = " + RoomList[x] + " is open or disabled, no vent warning set");
        CreateRoomsWithVentWarnings(x, "");
        ClearVentTime(x);
        VentMsg[x] = "";
    };
}


function GetRoom(x) { // Liefert den Raum von Sensor x
    if (logging) log("Reaching GetRoom x=" + x)
    let room = getObject(Sensor[x], 'rooms').enumNames[0];
    if (typeof room == "undefined") {
        log("Kein Raum definiert bei Sensor " + Sensor[x], 'error');
        return "Kein Raum definiert";
    };
    if (typeof room == 'object') room = room.de;
    return room;
}

function CheckWindow(x) { //Für einzelnes Fenster/Tür. Via Trigger angesteuert. Eigentliche Primärauswertefunktion des Skriptes
    let TempRoom = GetRoom(x); //Raum des aktuellen Sensors bestimmen
    let TempRoomIndex = RoomList.indexOf(TempRoom); // Raumlistenindex für aktuellen Raum bestimmen
    if (logging) log("reaching CheckWindow, SensorVal[" + x + "]=" + SensorVal[x] + " SensorOldVal=" + SensorOldVal[x] + " TempRoom=" + TempRoom + " SensorType[x]=" + SensorType[x] + " TempRoomIndex=" + TempRoomIndex)

    if (((SensorVal[x] == "open") && (SensorOldVal[x] == "closed" || SensorOldVal[x] == "" || SensorOldVal[x] != "tilted")) || ((SensorVal[x] == "tilted") && (SensorOldVal[x] == "closed" || SensorOldVal[x] == "" || SensorOldVal[x] != "open"))) { //Fenster war geschlossen und wurde geöffnet oder gekippt - Wechsel von open auf tilted nicht berücksichtigt!!!

        if (SensorType[x] == "Window") {
            if (RoomOpenWindowCount[TempRoomIndex] == 0) setState(praefix + TempRoom + ".WindowIsOpen", true, true);
            if (RoomOpenWindowCount[TempRoomIndex] == 0) setState(praefix + TempRoom + ".RoomIsOpen", true, true);

            OpenWindowCount++; //Gesamtfensterzähler erhöhen
            RoomOpenWindowCount[TempRoomIndex]++; //Raumfensterzähler erhöhen

            if (logging) log("RoomOpenWindowCount für " + TempRoom + "=" + RoomOpenWindowCount[TempRoomIndex]);
            setState(praefix + TempRoom + ".RoomOpenWindowCount", RoomOpenWindowCount[TempRoomIndex], true);

            if (!IsInit) {
                if (RoomOpenWindowCount[TempRoomIndex] == 1) {
                    RoomStateTimeStamp[TempRoomIndex] = new Date().getTime(); //Bei Erstöffnung Zeitstempel für Raum auf jetzt setzen
                };

                if (SensorVal[x] == "open") {
                    if (logging) log(TempRoom + " Fenster geöffnet");
                    if (SendWindowOpenCloseMsg[TempRoomIndex]) Meldung(ReplaceChars(TempRoom) + " Fenster geöffnet!");
                    if (UseEventLog) WriteEventLog(ReplaceChars(TempRoom) + " Fenster geöffnet!");
                }
                else if (SensorVal[x] == "tilted") {
                    if (logging) log(TempRoom + " Fenster gekippt");
                    if (SendWindowOpenCloseMsg[TempRoomIndex]) Meldung(ReplaceChars(TempRoom) + " Fenster gekippt!");
                    if (UseEventLog) WriteEventLog(ReplaceChars(TempRoom) + " Fenster gekippt!");
                };

            };

            if (RoomOpenWindowCount[TempRoomIndex] == 1) {
                if (logging) log("SendWindowWarnMsg=" + SendWindowWarnMsg[TempRoomIndex] + " TempRoomIndex=" + TempRoomIndex)
                WindowWarnRuntime[TempRoomIndex] = 0;
                if (SendWindowWarnMsg[TempRoomIndex]) {
                    if (logging) log("Setting Interval to Room:" + TempRoom);
                    OpenWindowMsgHandler[TempRoomIndex] = setInterval(function () {// Interval starten und Dauer bei Ansage aufaddieren
                        WindowWarnRuntime[TempRoomIndex] = WindowWarnRuntime[TempRoomIndex] + TimeToWindowMsg;
                        if (RoomWindowMsgCount[TempRoomIndex] <= MaxMessages - 1) Meldung(ReplaceChars(TempRoom) + "fenster seit " + CreateTimeString(CalcTimeDiff("now", RoomStateTimeStamp[TempRoomIndex])) + " geöffnet!");
                        RoomWindowMsgCount[TempRoomIndex]++;
                    }, TimeToWindowMsg);
                };
            };
        } else if (SensorType[x] == "Door") {
            if (RoomOpenDoorCount[TempRoomIndex] == 0) setState(praefix + TempRoom + ".DoorIsOpen", true, true);
            if (RoomOpenDoorCount[TempRoomIndex] == 0) setState(praefix + TempRoom + ".RoomIsOpen", true, true);

            OpenDoorCount++; //Gesamttürzähler erhöhen
            RoomOpenDoorCount[TempRoomIndex]++; //Raumtürzähler erhöhen

            if (logging) log("RoomOpenDoorCount für " + TempRoom + "=" + RoomOpenDoorCount[TempRoomIndex]);
            setState(praefix + TempRoom + ".RoomOpenDoorCount", RoomOpenDoorCount[TempRoomIndex], true);

            if (!IsInit) {
                if (RoomOpenDoorCount[TempRoomIndex] == 1) {
                    RoomDoorStateTimeStamp[TempRoomIndex] = new Date().getTime(); //Bei Erstöffnung Zeitstempel für Raum auf jetzt setzen
                };
                if (SensorVal[x] == "open") {
                    if (logging) log(TempRoom + " Tür geöffnet");
                    if (SendDoorOpenCloseMsg[TempRoomIndex]) Meldung(ReplaceChars(TempRoom) + " Tür geöffnet!");
                    if (UseEventLog) WriteEventLog(ReplaceChars(TempRoom) + " Tür geöffnet!");
                }
                else if (SensorVal[x] == "tilted") {
                    if (logging) log(TempRoom + " Tür gekippt");
                    if (SendDoorOpenCloseMsg[TempRoomIndex]) Meldung(ReplaceChars(TempRoom) + " Tür gekippt!");
                    if (UseEventLog) WriteEventLog(ReplaceChars(TempRoom) + " Tür gekippt!");
                };
            };

            if (RoomOpenDoorCount[TempRoomIndex] == 1) {
                if (logging) log("SendDoorWarnMsg=" + SendDoorWarnMsg[TempRoomIndex] + " TempRoomIndex=" + TempRoomIndex)
                DoorWarnRuntime[TempRoomIndex] = 0;
                if (SendDoorWarnMsg[TempRoomIndex]) {
                    if (logging) log("Setting Interval to Room:" + TempRoom);
                    OpenDoorMsgHandler[TempRoomIndex] = setInterval(function () {// Interval starten und Dauer bei Ansage aufaddieren
                        DoorWarnRuntime[TempRoomIndex] = DoorWarnRuntime[TempRoomIndex] + TimeToDoorMsg;
                        if (RoomDoorMsgCount[TempRoomIndex] <= MaxMessages - 1) Meldung(ReplaceChars(TempRoom) + "tür seit " + CreateTimeString(CalcTimeDiff("now", RoomDoorStateTimeStamp[TempRoomIndex])) + " geöffnet!");
                        RoomDoorMsgCount[TempRoomIndex]++;
                    }, TimeToDoorMsg);
                };
            };

        }
    }
    else if (SensorVal[x] == "closed") {
        if (SensorType[x] == "Window") {
            if (!IsInit) { // Wenn nicht in Initialisierungsphase (Skriptstart)
                if (OpenWindowCount > 0) OpenWindowCount--;
                if (RoomOpenWindowCount[TempRoomIndex] > 0) RoomOpenWindowCount[TempRoomIndex]--;
                if (RoomOpenWindowCount[TempRoomIndex] == 0) { // Wenn letztes Fenster geschlossen
                    RoomStateTimeStamp[TempRoomIndex] = new Date().getTime(); //Bei schliessen Zeitstempel für Raum setzen
                    if (logging) log(TempRoom + " Fenster geschlossen.");
                    if (SendWindowOpenCloseMsg[TempRoomIndex]) Meldung(ReplaceChars(TempRoom) + " Fenster geschlossen!");
                    if (UseEventLog) WriteEventLog(ReplaceChars(TempRoom) + " Fenster geschlossen!");
                };
            };
            setState(praefix + TempRoom + ".RoomOpenWindowCount", RoomOpenWindowCount[TempRoomIndex], true);
        }
        else if (SensorType[x] == "Door") {
            if (!IsInit) { // Wenn nicht in Initialisierungsphase (Skriptstart)
                if (OpenDoorCount > 0) OpenDoorCount--;
                if (RoomOpenDoorCount[TempRoomIndex] > 0) RoomOpenDoorCount[TempRoomIndex]--;
                if (RoomOpenDoorCount[TempRoomIndex] == 0) { // Wenn letzte Tür geschlossen
                    RoomDoorStateTimeStamp[TempRoomIndex] = new Date().getTime(); //Bei schliessen Zeitstempel für Raum setzen
                    if (logging) log(TempRoom + " Tür geschlossen.");
                    if (SendDoorOpenCloseMsg[TempRoomIndex]) Meldung(ReplaceChars(TempRoom) + " Tür geschlossen!");
                    if (UseEventLog) WriteEventLog(ReplaceChars(TempRoom) + " Tür geschlossen!");
                };
            };
            if (logging) log("RoomOpenDoorCount[TempRoomIndex]=" + RoomOpenDoorCount[TempRoomIndex] + " TempRoom=" + TempRoom + " TempRoomIndex=" + TempRoomIndex)
            setState(praefix + TempRoom + ".RoomOpenDoorCount", RoomOpenDoorCount[TempRoomIndex], true);
        };

        if (RoomOpenWindowCount[TempRoomIndex] == 0) { //Wenn alle Fenster im Raum geschlossen, Dp aktualisieren und Intervall/Timeout löschen
            setState(praefix + TempRoom + ".WindowIsOpen", false, true);
            ClearWindowWarnTime(TempRoomIndex);
        };

        if (RoomOpenDoorCount[TempRoomIndex] == 0) { //Wenn alle Türen im Raum geschlossen, Dp aktualisieren
            setState(praefix + TempRoom + ".DoorIsOpen", false, true);
            ClearDoorWarnTime(TempRoomIndex);
        };

        if (RoomOpenDoorCount[TempRoomIndex] == 0 && RoomOpenWindowCount[TempRoomIndex] == 0) { //Wenn alle Türen und Fenster im Raum geschlossen, Dp aktualisieren
            setState(praefix + TempRoom + ".RoomIsOpen", false, true);
        };
    };

    //*************Bereich gekippte Fenster */
    if (SensorType[x] == "Window") {
        if (SensorVal[x] == "tilted") {
            if (logging) log("Reaching tilted+ in checkWindow");
            TiltedWindowCount++; //Gekippte Fenster Zähler erhöhen
            RoomTiltedWindowCount[TempRoomIndex]++;
            setState(praefix + TempRoom + ".RoomTiltedWindowCount", RoomTiltedWindowCount[TempRoomIndex], true);
            if (logging) log("TiltedWindowCount=" + TiltedWindowCount + " RoomTiltedWindowCount=" + RoomTiltedWindowCount[TempRoomIndex] + " TempRoomIndex=" + TempRoomIndex)
        }
        else if ((SensorVal[x] != "tilted" && SensorOldVal[x] == "tilted") && IsInit == false) { //Bei Wechsel von gekippt auf offen oder geschlossen und keine Initphase
            if (logging) log("Reaching tilted- in checkWindow");
            TiltedWindowCount--; //Gekippte Fenster Zähler erniedrigen
            RoomTiltedWindowCount[TempRoomIndex]--;
            if (TiltedWindowCount < 0) TiltedWindowCount = 0;
            if (RoomTiltedWindowCount[TempRoomIndex] < 0) RoomTiltedWindowCount[TempRoomIndex] = 0;

            setState(praefix + TempRoom + ".RoomTiltedWindowCount", RoomTiltedWindowCount[TempRoomIndex], true);
            if (logging) log("TiltedWindowCount=" + TiltedWindowCount + " RoomTiltedWindowCount=" + RoomTiltedWindowCount[TempRoomIndex] + " TempRoomIndex=" + TempRoomIndex)
        };

        if (IsInit && RoomTiltedWindowCount[TempRoomIndex] == 0) {
            setState(praefix + TempRoom + ".RoomTiltedWindowCount", RoomTiltedWindowCount[TempRoomIndex], true);
        };

        if (RoomOpenWindowCount[TempRoomIndex] == 0 && RoomOpenDoorCount[TempRoomIndex] == 0) {
            setState(praefix + TempRoom + ".RoomIsOpen", false, true);
        }
        else {
            setState(praefix + TempRoom + ".RoomIsOpen", true, true);
        };
    }
    /***************Ende Bereich gekippte Fenster Beginn Bereich gekippte Türen*/


    if (SensorType[x] == "Door") {
        if (SensorVal[x] == "tilted") {
            if (logging) log("Reaching tilted+ in checkWindow");
            TiltedDoorCount++; //Gekippte Türen Zähler erhöhen
            RoomTiltedDoorCount[TempRoomIndex]++;
            setState(praefix + TempRoom + ".RoomTiltedDoorCount", RoomTiltedDoorCount[TempRoomIndex], true);
            if (logging) log("TiltedDoorCount=" + TiltedDoorCount + " RoomTiltedDoorCount=" + RoomTiltedDoorCount[TempRoomIndex] + " TempRoomIndex=" + TempRoomIndex)
        }
        else if ((SensorVal[x] != "tilted" && SensorOldVal[x] == "tilted") && IsInit == false) { //Bei Wechsel von gekippt auf offen oder geschlossen und keine Initphase
            if (logging) log("Reaching tilted- in checkDoor");
            TiltedDoorCount--; //Gekippte Türen Zähler erniedrigen
            RoomTiltedDoorCount[TempRoomIndex]--;
            if (TiltedDoorCount < 0) TiltedDoorCount = 0;
            if (RoomTiltedDoorCount[x] < 0) RoomTiltedDoorCount[x] = 0;

            setState(praefix + TempRoom + ".RoomTiltedDoorCount", RoomTiltedDoorCount[TempRoomIndex], true);
            if (logging) log("TiltedDoorCount=" + TiltedDoorCount + " RoomTiltedDoorCount=" + RoomTiltedDoorCount[TempRoomIndex] + " TempRoomIndex=" + TempRoomIndex)
        };

        if (IsInit && RoomTiltedDoorCount[TempRoomIndex] == 0) {
            setState(praefix + TempRoom + ".RoomTiltedDoorCount", RoomTiltedDoorCount[TempRoomIndex], true);
        };

        if (RoomOpenWindowCount[TempRoomIndex] == 0 && RoomOpenDoorCount[TempRoomIndex] == 0) {
            setState(praefix + TempRoom + ".RoomIsOpen", false, true);
        }
        else {
            setState(praefix + TempRoom + ".RoomIsOpen", true, true);
        };
    }
    /***************Ende Bereich gekippte Türen*/



    RoomOpenCount[TempRoomIndex] = RoomOpenDoorCount[TempRoomIndex] + RoomOpenWindowCount[TempRoomIndex];
    setState(praefix + TempRoom + ".RoomOpenCount", RoomOpenCount[TempRoomIndex], true);

    if (OpenWindowCount == 0) { //Wenn kein Fenster mehr offen Datenpunkte aktualisieren
        setState(praefix + "WindowsOpen", 0, true);
        setState(praefix + "WindowsTilted", 0, true);
        setState(praefix + "AllWindowsClosed", true, true);
        if (logging) log("Alle Fenster geschlossen.");
    }
    else if (OpenWindowCount != 0) { //ansonsten ebenfalls Datenpunkte (mit anderen Werten) aktualisieren
        setState(praefix + "WindowsOpen", OpenWindowCount, true);
        setState(praefix + "WindowsTilted", TiltedWindowCount, true);
        setState(praefix + "AllWindowsClosed", false, true);
    };

    if (logging) log("Offene Fenster gesamt= " + OpenWindowCount);

    if (OpenDoorCount == 0) { //Wenn keine Tür mehr offen Datenpunkte aktualisieren
        setState(praefix + "DoorsOpen", 0, true);
        setState(praefix + "DoorsTilted", 0, true);
        setState(praefix + "AllDoorsClosed", true, true);
        if (logging) log("Alle Türen geschlossen.");
    }
    else { //ansonsten ebenfalls Datenpunkte (mit anderen Werten) aktualisieren
        setState(praefix + "DoorsOpen", OpenDoorCount, true);
        setState(praefix + "DoorsTilted", TiltedDoorCount, true);
        setState(praefix + "AllDoorsClosed", false, true);
    };

    if (logging) log("Offene Türen gesamt= " + OpenDoorCount);

    if (IsInit) { // Wenn in Initialisierungsphase (Skriptstart)
        RoomStateTimeStamp[TempRoomIndex] = getState(praefix + RoomList[TempRoomIndex] + ".WindowIsOpen").lc;
        RoomDoorStateTimeStamp[TempRoomIndex] = getState(praefix + RoomList[TempRoomIndex] + ".DoorIsOpen").lc;

    }
    else {
        if (SensorType[x] == "Window") VentCheck(TempRoomIndex);
        if (logging) log("RoomStateTimeStamp at checkWindow= " + RoomStateTimeStamp[TempRoomIndex] + " ms =" + formatDate(RoomStateTimeStamp[TempRoomIndex], LogTimeStampFormat));
    };

    RoomStateTimeCount[TempRoomIndex] = CalcTimeDiff("now", RoomStateTimeStamp[TempRoomIndex]);
    RoomDoorStateTimeCount[TempRoomIndex] = CalcTimeDiff("now", RoomDoorStateTimeStamp[TempRoomIndex]);

}

function CheckForHmShit(val, x) {
    if (logging) log("Reaching CheckForHmShit val=" + val + " typof val=" + typeof (val) + " x=" + x + " Sensor[x]=" + Sensor[x]);

    if (Sensor[x].indexOf("hm-rpc.") != -1) { //Prüfen ob Sensor= HM Sensor
        if (getObject(Sensor[x]).common.states) { //Prüfen ob Wertelistentext vorhanden
            if (logging) log(Sensor[x] + " hat Zustandstext " + getObject(Sensor[x]).common.states[val] + ", Wert= " + val + " Wert wird durch Zustandstext ersetzt");
            return getObject(Sensor[x]).common.states[val]; //Wert durch Zustandstext ersetzen um HM Wertekuddelmuddel bei HM Sensoren zu kompensieren und in Kleinbuchstaben wandeln
        }
        else {
            // if (logging) log(Sensor[x] + "(HM) hat keinen Zustandstext, Wert wird beibehalten")
            return val;
        };
    }
    else {
        // if (logging) log(Sensor[x] + " ist non HM, Wert wird beibehalten")
        return val;
    };

}

function SimplyfyWindowStates(val, x) { //Die verschiedenen Gerätestates zu open, close oder tilted vereinfachen
    val = String(val).toLowerCase();
    val = CheckForHmShit(val, x).toLowerCase();

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
            TimeString = TimeString + hours + " Std. ";
        } else { //Plural
            TimeString = TimeString + hours + " Std. ";
        };
    } else {
        TimeString = TimeString + "";
    };

    if (mins > 0) {
        if (mins == 1) { //Singular
            TimeString = TimeString + mins + " Min. ";
        } else { //Plural
            TimeString = TimeString + mins + " Min. ";
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

function ClearWindowWarnTime(x) {
    if (logging) log("reaching ClearWindowWarnTime - [x] = " + [x]);

    if (typeof (OpenWindowMsgHandler[x]) == "object") { //Wenn ein Interval gesetzt ist, löschen
        if (logging) log("Clearing Interval for " + x)
        clearInterval(OpenWindowMsgHandler[x]); //
        RoomWindowMsgCount[x] = 0; //Nachrichtenzähler wieder resetten
    };
}

function ClearDoorWarnTime(x) {
    if (logging) log("reaching ClearDoorWarnTime - [x] = " + [x]);

    if (typeof (OpenDoorMsgHandler[x]) == "object") { //Wenn ein Interval gesetzt ist, löschen
        if (logging) log("Clearing Door Interval for " + x)
        clearInterval(OpenDoorMsgHandler[x]); //
        RoomDoorMsgCount[x] = 0; //Nachrichtenzähler wieder resetten
    };
}

function CreateTrigger() {
    //Trigger für Sensoren erzeugen
    let IgnoreTime;
    for (let x = 0; x < Sensor.length; x++) { //Alle Sensoren durchlaufen
        IgnoreInProcess[x] = true;
        on(Sensor[x], function (dp) { //Trigger in Schleife erstellen
            if (SensorType[x] == "Window") {
                IgnoreTime = WindowIgnoreTime
            } else if (SensorType[x] == "Door") {
                IgnoreTime = DoorIgnoreTime
            };
            if (logging) log("Trigger= " + x + " Wert= " + dp.state.val + " Alter Wert= " + dp.oldState.val + " dp.channelId=" + dp.channelId + " dp.channelName=" + dp.channelName);
            //if (logging) log("Trigger= " + x + " Wert= " + dp.state.val + " Alter Wert= " + dp.oldState.val);
            if (IgnoreInProcess[x] == true) { //Bei erster Triggerung aktuellen Sensorwert merken und Timeout starten
                //  log("Oldstate=" + dp.oldState.val)
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
                        CreateRoomsWithOpenDoorsList();
                        CreateRoomsWithTiltedDoorsList();
                        CreateRoomsWithOpeningsList();
                        CreateOverviewTable();
                    } else {
                        if (logging) log("Ignore Timeout for " + x + " exceeded, no Value change, nothing to do. Actual Value=" + SimplyfyWindowStates(getState(Sensor[x]).val, x) + " remembered Value=" + IgnoreValue[x]);
                    };
                    IgnoreInProcess[x] = true;
                }, IgnoreTime);
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
        on(praefix + RoomList[x] + ".SendWindowOpenCloseMsg", function (dp) { //Trigger
            SendWindowOpenCloseMsg[x] = dp.state.val;
        });
        on(praefix + RoomList[x] + ".SendDoorOpenCloseMsg", function (dp) { //Trigger
            SendDoorOpenCloseMsg[x] = dp.state.val;
        });
        on(praefix + RoomList[x] + ".SendWindowWarnMsg", function (dp) { //Trigger
            SendWindowWarnMsg[x] = dp.state.val;
            ClearWindowWarnTime(x);
        });
        on(praefix + RoomList[x] + ".SendDoorWarnMsg", function (dp) { //Trigger
            SendDoorWarnMsg[x] = dp.state.val;
            ClearWindowWarnTime(x);
        });

    };


    on(praefix + "MuteMode", function (dp) { //Trigger für MuteMode erzeugen
        MuteMode = dp.state.val;
    });

    if (PresenceDp != "") { //Trigger fürPresenceDp erzeugen wenn vorhanden
        if (logging) log("PresenceDp available, created Trigger for Presence")
        on(PresenceDp, function (dp) { //Trigger für Presence erzeugen
            Presence = dp.state.val;
            if (logging) log("Presence changed to " + Presence)
        });
    };

    onStop(function () { //Bei Scriptende alle Timer löschen
        for (let x = 0; x < RoomList.length; x++) {
            ClearVentTime(x);
            ClearWindowWarnTime(x)
        };
    }, 100);
}
