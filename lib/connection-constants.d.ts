export declare const spaDeviceBleConstants: {
    SERVICE_UUID_OPERATION: string;
    CHARACTERISTIC_UUID_KEYBOARD: string;
    CHARACTERISTIC_UUID_TEMPERATURE: string;
    CHARACTERISTIC_UUID_TIME: string;
    CHARACTERISTIC_UUID_SESSION: string;
    CHARACTERISTIC_UUID_DISPLAY: string;
    CHARACTERISTIC_UUID_WIFICREDS: string;
    CHARACTERISTIC_UUID_VERSION: string;
    CHARACTERISTIC_UUID_WIFIMAC: string;
    CHARACTERISTIC_UUID_MMODE: string;
    CHARACTERISTIC_UUID_MCODE: string;
    CHARACTERISTIC_UUID_BTNAME: string;
    CHARACTERISTIC_UUID_CRAS: string;
};
/**
 * MCODE (MASTERCODE) TWO PARTS:
 *
 * <---- MCODE_B64 (16) ----><-- PASSWORD (UP TO 8 CHARS) -->
 *
 * MMODE DEFINITION:
 *
 * | CODE |  DIRECTION     |                  MODULE
 *   Module to Phone
 * | 'M'  |   ------->     | Master mode: MCODE_B64 (&PASS) matches
 * | 'N'  |   ------->     | Non Master mode: only PASS matches
 * | 'B'  |   ------->     | Blocked mode: nothing matches
 * | 'F'  |   ------->     | Free mode: nothing defined
 *   Phone to Module
 * | 'S'  |   <-------     | Set MCODE_B64 & PASS, if mode 'F' or MCODE_B64 matches
 * | 'C'  |   <-------     | Clear Master code: only allowed in Master mode
 * | 'W'  |   <-------     | Wifi connected status: only allowed in Master mode
 * | 'Z'  |   <-------     | Wifi Scan start: only allowed in Master mode
 * | 'D'  |   <-------     | Forces BT disconnect
 */
export declare const spaDeviceMmodeUpConstants: {
    MASTER: string;
    NON_MASTER: string;
    BLOCKED: string;
    FREE: string;
};
export declare const spaDeviceMmodeDownConstants: {
    SET: string;
    CLEAR: string;
    WIFI_STATUS: string;
    WIFI_SCAN: string;
    DISCONNECT: string;
};
