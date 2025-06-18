// This file contains constants used for connecting to the spa device via Bluetooth Low Energy (BLE).
export const spaDeviceBleConstants = {
    // GATT Services
    SERVICE_UUID_OPERATION: "c5a092a5-2202-4ac6-8734-2e8ff796094d",
    // GATT Characteristics    
    CHARACTERISTIC_UUID_KEYBOARD: "12ead13c-4d06-48b7-a3f9-cdf725acdd87",
    CHARACTERISTIC_UUID_TEMPERATURE: "0daecf8f-2352-4ae8-bdb8-4ae862f041e3",
    CHARACTERISTIC_UUID_TIME: "8cea517c-2d76-4190-ae05-2e222a3caacb",
    CHARACTERISTIC_UUID_SESSION: "c67c0b5f-0f50-44fc-a0f9-449ff1f476f1",
    CHARACTERISTIC_UUID_DISPLAY: "30105eb3-19dc-4621-a227-a917b43162a6",
    CHARACTERISTIC_UUID_WIFICREDS: "5eb76cac-ada4-43c2-9ed0-b80547542e9f",
    CHARACTERISTIC_UUID_VERSION: "207da212-c2fd-43b5-9664-ac15166364d2",
    CHARACTERISTIC_UUID_WIFIMAC: "aefc6b90-26f1-4842-b720-3d47f4a087cf",
    CHARACTERISTIC_UUID_MMODE: "984cdbfb-446b-43b2-a879-c857a9a0f638",
    CHARACTERISTIC_UUID_MCODE: "6436e996-e573-4ff7-83fd-d0ea0bd09458",
    CHARACTERISTIC_UUID_BTNAME: "f8733ee9-6e45-485a-a8a1-9e4e8bdb0536",
    CHARACTERISTIC_UUID_CRAS: "71d67ace-65d6-4d28-b08f-f54735e7d50c"
}
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
export const spaDeviceMmodeUpConstants = {
    MASTER: 'M',       // Module to Phone: Master mode
    NON_MASTER: 'N',   // Module to Phone: Non Master mode
    BLOCKED: 'B',      // Module to Phone: Blocked mode
    FREE: 'F'          // Module to Phone: Free mode
};

export const spaDeviceMmodeDownConstants = {
    SET: 'S',          // Phone to Module: Set MCODE_B64 & PASS
    CLEAR: 'C',        // Phone to Module: Clear Master code
    WIFI_STATUS: 'W',  // Phone to Module: Wifi connected status
    WIFI_SCAN: 'Z',    // Phone to Module: Wifi Scan start
    DISCONNECT: 'D'    // Phone to Module: Forces BT disconnect
};
