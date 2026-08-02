PROGRAM ParkingGateLogic
VAR_INPUT
    I_EntryLoop : BOOL;
    I_TicketButton : BOOL;
    I_TicketTaken : BOOL;
    I_GateOpenLS : BOOL;
    I_GateCloseLS : BOOL;
    I_SafetyPhotocell : BOOL;
    I_ExitLoop : BOOL;
END_VAR

VAR_OUTPUT
    Q_GateMotorOpen : BOOL;
    Q_GateMotorClose : BOOL;
    Q_DispenseTicket : BOOL;
    Q_GreenLight : BOOL;
    Q_RedLight : BOOL;
    Q_Alarm : BOOL;
END_VAR

VAR
    TON_CloseDelay : TON;
END_VAR

// Main logic cycle
Q_GateMotorOpen := I_EntryLoop AND I_TicketTaken AND NOT I_GateOpenLS;
Q_DispenseTicket := I_EntryLoop AND I_TicketButton;
Q_GreenLight := I_GateOpenLS;
Q_RedLight := NOT I_GateOpenLS;

// Safety and closing motor logic
Q_GateMotorClose := NOT I_EntryLoop AND NOT I_ExitLoop AND NOT I_GateCloseLS AND NOT I_SafetyPhotocell;
Q_Alarm := I_SafetyPhotocell AND Q_GateMotorClose;

END_PROGRAM
