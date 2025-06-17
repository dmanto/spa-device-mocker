# spa-device-mocker

Simulates the behavior of spa and sauna devices for development and testing purposes.

This mocker is designed to emulate the key features of embedded devices (e.g., ESP32-based units) used in spa and sauna control systems. It supports Bluetooth-like interactions and backend API behaviors, enabling frontend and server-side integration testing without the need for physical hardware.

## Features

- Emulates state machines and device behavior
- Provides simulated Bluetooth interaction via WebSocket or custom interfaces
- Mocks backend responses and device communication
- Configurable scenarios for happy-path or edge-case testing
- Lightweight, standalone, and easy to integrate into CI or local development

## Use Cases

- Frontend development without real hardware
- Automated integration testing
- Backend server development and validation
- Demo environments for stakeholders

## Getting Started

```bash
git clone https://github.com/your-org/spa-device-mocker.git
cd spa-device-mocker
npm install
npm start
