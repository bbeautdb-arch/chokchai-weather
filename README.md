# อากาศโชคชัย (Chok Chai Weather)

PWA อากาศสดสำหรับ **โชคชัย · นครราชสีมา** — ดีไซน์ liquid glass, ดึงข้อมูลจาก [Open-Meteo](https://open-meteo.com/), พื้นหลังตามสภาพอากาศและเวลาของวัน

## เปิดใช้งาน

- หน้าเว็บ (GitHub Pages): https://bbeautdb-arch.github.io/chokchai-weather/
- รันท้องถิ่น: `npm install && npm run dev`
- บิลด์: `npm run build` (base path = `/chokchai-weather/`)

## คุณสมบัติ

- อากาศปัจจุบัน + กราฟฝน/อุณหภูมรายชั่วโมง
- พื้นหลัง WebP หลายภาพต่อประเภทอากาศ (แดด / มีเมฆบางส่วน / มีเมฆ / ฝน / พายุ / หมอก) × เช้ามืด / กลางวัน / พระอาทิตย์ตก / กลางคืน — สุ่มเลือก
- แคชครั้งล่าสุดใน localStorage, ลองใหม่เมื่อเครือข่ายล้ม, Service Worker แบบ NetworkFirst สำหรับ API

## เครดิตพื้นหลัง

ภาพพื้นหลังใช้ภายใต้ใบอนุญาตฟรี **Pexels License** และ **Unsplash License** (ใช้เชิงพาณิชย์ได้)  
รายละเอียดไฟล์และลิงก์ต้นทางอยู่ที่ [`public/assets/CREDITS.txt`](public/assets/CREDITS.txt)

## เทคโนโลยี

Vite · React · TypeScript · Tailwind CSS v4 · vite-plugin-pwa · Open-Meteo

## ใบอนุญาตโค้ด

โค้ดในรีโปนี้เผยแพร่เพื่อใช้งานสาธารณะโดยเจ้าของบัญชี — ดูเครดิตภาพแยกตามไฟล์ CREDITS
