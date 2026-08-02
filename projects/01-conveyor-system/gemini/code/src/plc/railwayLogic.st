PROGRAM Main
VAR
  bStart : BOOL;
  bStop : BOOL;
  bSystemActive : BOOL;
END_VAR

IF bStart AND NOT bStop THEN
  bSystemActive := TRUE;
ELSIF bStop THEN
  bSystemActive := FALSE;
END_IF;
