const conveyorLogicSource = `PROGRAM ConveyorSystem
VAR
  StartButton : BOOL;
  StopButton : BOOL;
  ConveyorMotor : BOOL;
END_VAR

IF StartButton AND NOT StopButton THEN
  ConveyorMotor := TRUE;
ELSIF StopButton THEN
  ConveyorMotor := FALSE;
END_IF;
END_PROGRAM`;

export default conveyorLogicSource;
