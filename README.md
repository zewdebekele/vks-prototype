# Village Knowledge System (VKS)

An offline-first community platform for rural villages in Ethiopia. Allows users to report problems, share knowledge, and access information using voice, images, or text - without internet.

## Features

- Voice Problem Reporting - Press and hold to record (2 min max)
- Text Alternative - Type problems for literate users
- 3 Languages - Amharic, Oromifa, Tigrinya
- Text-to-Speech - Read answers and articles aloud
- Offline Storage - IndexedDB with 500MB limit
- Peer Sync Simulation - Bluetooth/WiFi Direct sync
- Champion Mode - Answer verification with trust badge
- USB Export - Backup data via data mule

## Technology Stack

- Frontend: React 18 + Vite
- Offline Storage: IndexedDB
- Voice: Web Speech API
- Languages: Amharic, Oromifa, Tigrinya

## How to Run Locally

git clone https://github.com/zewdebekele/vks-prototype.git
cd vks-prototype
npm install
npm run dev

Then open http://localhost:5173

## How to Use

1. Report Problem: Press and hold mic button -> speak -> select category -> submit
2. Text Alternative: Type problem in text box -> select category -> submit
3. Change Language: Click language buttons in header
4. View Feed: See all problems and answers
5. Add Answer: Click Add Answer under any problem
6. Champion Mode: Go to Sync tab -> toggle Champion Mode
7. Sync: Click Sync Now to simulate peer-to-peer sync

## Architecture

- Offline-First: Works without internet
- Peer-to-Peer: Sync via Bluetooth/WiFi Direct (simulated)
- Edge Computing: Raspberry Pi as village hub

## Repository

https://github.com/zewdebekele/vks-prototype

## Author

Zewde Bekele

## Course

SENG5232 - Software Architecture and Design
