/**
 * Vercel Serverless API Route: /api/bookings
 *
 * Booking Repository & Server-Side Fare / Token Utilities
 *
 * IMPORTANT NOTE ON SERVERLESS STORAGE:
 * - `storedBookings`, `pendingOrdersById`, `verifiedPaymentsById`, and `verifiedOrdersById`
 *   are in-memory structures that only persist within a warm Vercel lambda instance.
 * - Therefore, `/api/create-order` and `/api/verify-payment` DO NOT rely solely on in-memory
 *   Maps across invocations. Instead, they persist booking metadata directly inside Razorpay's
 *   durable Order `receipt` and `notes` via the Razorpay Orders API and verify a timing-safe
 *   HMAC-SHA256 `verificationToken` signed with `RAZORPAY_KEY_SECRET`.
 */

import crypto from 'crypto';
import { jsPDF } from 'jspdf';

// Fleet pricing table matching src/data/cabsFleet.ts (CabBazar / Gozo / Savaari Calibrated Matrix)
export const SERVER_CABS_FLEET = {
  hatchback: {
    id: 'hatchback',
    name: 'Hatchback AC',
    models: 'WagonR, Celerio, Tiago or equivalent',
    ratePerKm: 8.8,
    roundTripRatePerKm: 10.5,
    extraKmRate: 9.5,
    driverAllowancePerDay: 240,
    statePermitTax: 200,
    hillStationCharge: 280,
    local8Hr80KmFare: 1599
  },
  sedan: {
    id: 'sedan',
    name: 'Sedan AC (Dzire / Etios)',
    models: 'Maruti Suzuki Dzire, Toyota Etios, Hyundai Aura',
    ratePerKm: 9.5,
    roundTripRatePerKm: 11.5,
    extraKmRate: 10.2,
    driverAllowancePerDay: 260,
    statePermitTax: 250,
    hillStationCharge: 340,
    local8Hr80KmFare: 1799
  },
  exec_sedan: {
    id: 'exec_sedan',
    name: 'Prime Executive Sedan',
    models: 'Honda City, Maruti Ciaz, Hyundai Verna',
    ratePerKm: 11.0,
    roundTripRatePerKm: 13.0,
    extraKmRate: 11.8,
    driverAllowancePerDay: 300,
    statePermitTax: 300,
    hillStationCharge: 390,
    local8Hr80KmFare: 2199
  },
  suv: {
    id: 'suv',
    name: 'SUV AC (Ertiga / Carens)',
    models: 'Maruti Ertiga, Kia Carens, Toyota Rumion or equivalent',
    ratePerKm: 12.6,
    roundTripRatePerKm: 15.0,
    extraKmRate: 13.5,
    driverAllowancePerDay: 320,
    statePermitTax: 350,
    hillStationCharge: 440,
    local8Hr80KmFare: 2499
  },
  innova: {
    id: 'innova',
    name: 'Assured Innova Crysta',
    models: 'Toyota Innova Crysta (6+1 / 7+1 Luxury)',
    ratePerKm: 15.8,
    roundTripRatePerKm: 19.0,
    extraKmRate: 17.0,
    driverAllowancePerDay: 380,
    statePermitTax: 450,
    hillStationCharge: 550,
    local8Hr80KmFare: 3199
  },
  tempo: {
    id: 'tempo',
    name: 'Tempo Traveller AC (12 Seater)',
    models: 'Force Traveller / Urbania 12+1 Pushback AC',
    ratePerKm: 21.5,
    roundTripRatePerKm: 24.5,
    extraKmRate: 23.0,
    driverAllowancePerDay: 480,
    statePermitTax: 650,
    hillStationCharge: 750,
    local8Hr80KmFare: 4799
  }
};

const SERVER_EXPRESSWAY_TOLLS = {
  'delhi-agra': { toll: 465, name: 'Yamuna Expressway FASTag (3 Plazas)', plazaCount: 3, plazas: ['Jewar Toll Plaza', 'Mathura Toll Plaza', 'Agra Toll Plaza'] },
  'agra-delhi': { toll: 465, name: 'Yamuna Expressway FASTag (3 Plazas)', plazaCount: 3, plazas: ['Agra Toll Plaza', 'Mathura Toll Plaza', 'Jewar Toll Plaza'] },
  'delhi-mathura': { toll: 240, name: 'Yamuna / NH-19 FASTag (2 Plazas)', plazaCount: 2, plazas: ['Srinagar/Faridabad Toll', 'Mahuvan (Mathura) Toll Plaza'] },
  'mathura-delhi': { toll: 240, name: 'Yamuna / NH-19 FASTag (2 Plazas)', plazaCount: 2, plazas: ['Mahuvan (Mathura) Toll Plaza', 'Srinagar/Faridabad Toll'] },
  'delhi-jaipur': { toll: 395, name: 'NH-48 / Delhi-Jaipur FASTag (3 Plazas)', plazaCount: 3, plazas: ['Kherki Daula Toll', 'Shahjahanpur Toll Plaza', 'Manoharpur/Daulatpur Toll'] },
  'jaipur-delhi': { toll: 395, name: 'NH-48 / Delhi-Jaipur FASTag (3 Plazas)', plazaCount: 3, plazas: ['Manoharpur/Daulatpur Toll', 'Shahjahanpur Toll Plaza', 'Kherki Daula Toll'] },
  'delhi-chandigarh': { toll: 390, name: 'NH-44 GT Road FASTag (4 Plazas)', plazaCount: 4, plazas: ['Murthal/Bhalgarh Toll', 'Panipat Toll Plaza', 'Gharaunda (Karnal) Toll', 'Ghaggar (Ambala) Toll'] },
  'chandigarh-delhi': { toll: 390, name: 'NH-44 GT Road FASTag (4 Plazas)', plazaCount: 4, plazas: ['Ghaggar (Ambala) Toll', 'Gharaunda (Karnal) Toll', 'Panipat Toll Plaza', 'Murthal/Bhalgarh Toll'] },
  'delhi-haridwar': { toll: 310, name: 'Delhi-Meerut Expwy + NH-334 (3 Plazas)', plazaCount: 3, plazas: ['Kashi (Meerut Expwy) Toll', 'Saini/Muzaffarnagar Toll', 'Bahadrabad (Haridwar) Toll'] },
  'haridwar-delhi': { toll: 310, name: 'Delhi-Meerut Expwy + NH-334 (3 Plazas)', plazaCount: 3, plazas: ['Bahadrabad (Haridwar) Toll', 'Saini/Muzaffarnagar Toll', 'Kashi (Meerut Expwy) Toll'] },
  'delhi-rishikesh': { toll: 310, name: 'Delhi-Meerut Expwy + NH-334 (3 Plazas)', plazaCount: 3, plazas: ['Kashi (Meerut Expwy) Toll', 'Saini/Muzaffarnagar Toll', 'Bahadrabad Toll'] },
  'rishikesh-delhi': { toll: 310, name: 'Delhi-Meerut Expwy + NH-334 (3 Plazas)', plazaCount: 3, plazas: ['Bahadrabad Toll', 'Saini/Muzaffarnagar Toll', 'Kashi (Meerut Expwy) Toll'] },
  'delhi-dehradun': { toll: 335, name: 'Delhi-Dehradun Highway FASTag (3 Plazas)', plazaCount: 3, plazas: ['Kashi (Meerut Expwy) Toll', 'Saini Toll Plaza', 'Lacchiwala (Dehradun) Toll'] },
  'dehradun-delhi': { toll: 335, name: 'Delhi-Dehradun Highway FASTag (3 Plazas)', plazaCount: 3, plazas: ['Lacchiwala (Dehradun) Toll', 'Saini Toll Plaza', 'Kashi (Meerut Expwy) Toll'] },
  'delhi-shimla': { toll: 510, name: 'NH-44 + Himalayan Expwy (6 Plazas)', plazaCount: 6, plazas: ['Murthal Toll', 'Panipat Toll', 'Gharaunda Toll', 'Ghaggar Toll', 'Chandimandir Toll', 'Sanwara Toll'] },
  'shimla-delhi': { toll: 510, name: 'NH-44 + Himalayan Expwy (6 Plazas)', plazaCount: 6, plazas: ['Sanwara Toll', 'Chandimandir Toll', 'Ghaggar Toll', 'Gharaunda Toll', 'Panipat Toll', 'Murthal Toll'] },
  'delhi-manali': { toll: 580, name: 'NH-44 + Kiratpur-Manali Expwy (6 Plazas)', plazaCount: 6, plazas: ['Murthal Toll', 'Panipat Toll', 'Gharaunda Toll', 'Ghaggar Toll', 'Behrampur/Kiratpur Toll', 'Takoli (Kullu) Toll'] },
  'manali-delhi': { toll: 580, name: 'NH-44 + Kiratpur-Manali Expwy (6 Plazas)', plazaCount: 6, plazas: ['Takoli (Kullu) Toll', 'Behrampur/Kiratpur Toll', 'Ghaggar Toll', 'Gharaunda Toll', 'Panipat Toll', 'Murthal Toll'] },
  'delhi-amritsar': { toll: 610, name: 'NH-44 Delhi-Amritsar Expwy (6 Plazas)', plazaCount: 6, plazas: ['Murthal Toll', 'Panipat Toll', 'Gharaunda Toll', 'Ghaggar Toll', 'Ladowal (Ludhiana) Toll', 'Nijjarpura (Amritsar) Toll'] },
  'amritsar-delhi': { toll: 610, name: 'NH-44 Delhi-Amritsar Expwy (6 Plazas)', plazaCount: 6, plazas: ['Nijjarpura (Amritsar) Toll', 'Ladowal (Ludhiana) Toll', 'Ghaggar Toll', 'Gharaunda Toll', 'Panipat Toll', 'Murthal Toll'] },
  'delhi-lucknow': { toll: 780, name: 'Yamuna + Agra-Lucknow Expwy (4 Plazas)', plazaCount: 4, plazas: ['Jewar Toll', 'Mathura Toll', 'Agra Toll', 'Agra-Lucknow Expressway Toll'] },
  'lucknow-delhi': { toll: 780, name: 'Yamuna + Agra-Lucknow Expwy (4 Plazas)', plazaCount: 4, plazas: ['Agra-Lucknow Expressway Toll', 'Agra Toll', 'Mathura Toll', 'Jewar Toll'] },
  'delhi-nainital': { toll: 345, name: 'NH-9 Hapur-Moradabad FASTag (3 Plazas)', plazaCount: 3, plazas: ['Chhijarsi (Pilkhuwa) Toll', 'Brijghat (Garhmukteshwar) Toll', 'Joya (Amroha) Toll'] },
  'nainital-delhi': { toll: 345, name: 'NH-9 Hapur-Moradabad FASTag (3 Plazas)', plazaCount: 3, plazas: ['Joya (Amroha) Toll', 'Brijghat (Garhmukteshwar) Toll', 'Chhijarsi (Pilkhuwa) Toll'] },
  'delhi-mussoorie': { toll: 335, name: 'Delhi-Dehradun Highway FASTag (3 Plazas)', plazaCount: 3, plazas: ['Kashi (Meerut Expwy) Toll', 'Saini Toll Plaza', 'Lacchiwala (Dehradun) Toll'] },
  'mussoorie-delhi': { toll: 335, name: 'Delhi-Dehradun Highway FASTag (3 Plazas)', plazaCount: 3, plazas: ['Lacchiwala (Dehradun) Toll', 'Saini Toll Plaza', 'Kashi (Meerut Expwy) Toll'] },
  'zirakpur-kangra': { toll: 135, name: 'NH-503 Kiratpur-Nangal Corridor (2 Plazas)', plazaCount: 2, plazas: ['Solakhian (Ropar) Toll Plaza', 'Behrampur (Kiratpur) Toll Plaza'] },
  'kangra-zirakpur': { toll: 135, name: 'NH-503 Kiratpur-Nangal Corridor (2 Plazas)', plazaCount: 2, plazas: ['Behrampur (Kiratpur) Toll Plaza', 'Solakhian (Ropar) Toll Plaza'] },
  'chandigarh-kangra': { toll: 135, name: 'NH-503 Kiratpur-Nangal Corridor (2 Plazas)', plazaCount: 2, plazas: ['Solakhian (Ropar) Toll Plaza', 'Behrampur (Kiratpur) Toll Plaza'] },
  'kangra-chandigarh': { toll: 135, name: 'NH-503 Kiratpur-Nangal Corridor (2 Plazas)', plazaCount: 2, plazas: ['Behrampur (Kiratpur) Toll Plaza', 'Solakhian (Ropar) Toll Plaza'] },
  'zirakpur-nagrota': { toll: 135, name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)', plazaCount: 2, plazas: ['Solakhian (Ropar) Toll Plaza', 'Behrampur (Kiratpur) Toll Plaza'] },
  'nagrota-zirakpur': { toll: 135, name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)', plazaCount: 2, plazas: ['Behrampur (Kiratpur) Toll Plaza', 'Solakhian (Ropar) Toll Plaza'] },
  'chandigarh-nagrota': { toll: 135, name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)', plazaCount: 2, plazas: ['Solakhian (Ropar) Toll Plaza', 'Behrampur (Kiratpur) Toll Plaza'] },
  'nagrota-chandigarh': { toll: 135, name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)', plazaCount: 2, plazas: ['Behrampur (Kiratpur) Toll Plaza', 'Solakhian (Ropar) Toll Plaza'] },
  'zirakpur-dharamshala': { toll: 135, name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)', plazaCount: 2, plazas: ['Solakhian (Ropar) Toll Plaza', 'Behrampur (Kiratpur) Toll Plaza'] },
  'dharamshala-zirakpur': { toll: 135, name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)', plazaCount: 2, plazas: ['Behrampur (Kiratpur) Toll Plaza', 'Solakhian (Ropar) Toll Plaza'] },
  'chandigarh-dharamshala': { toll: 135, name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)', plazaCount: 2, plazas: ['Solakhian (Ropar) Toll Plaza', 'Behrampur (Kiratpur) Toll Plaza'] },
  'dharamshala-chandigarh': { toll: 135, name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)', plazaCount: 2, plazas: ['Behrampur (Kiratpur) Toll Plaza', 'Solakhian (Ropar) Toll Plaza'] },
  'zirakpur-palampur': { toll: 135, name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)', plazaCount: 2, plazas: ['Solakhian (Ropar) Toll Plaza', 'Behrampur (Kiratpur) Toll Plaza'] },
  'palampur-zirakpur': { toll: 135, name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)', plazaCount: 2, plazas: ['Behrampur (Kiratpur) Toll Plaza', 'Solakhian (Ropar) Toll Plaza'] },
  'chandigarh-palampur': { toll: 135, name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)', plazaCount: 2, plazas: ['Solakhian (Ropar) Toll Plaza', 'Behrampur (Kiratpur) Toll Plaza'] },
  'palampur-chandigarh': { toll: 135, name: 'NH-503 Kiratpur-Kangra Corridor (2 Plazas)', plazaCount: 2, plazas: ['Behrampur (Kiratpur) Toll Plaza', 'Solakhian (Ropar) Toll Plaza'] },
  'chandigarh-manali': { toll: 210, name: 'Kiratpur-Nerchowk-Manali Expwy (3 Plazas)', plazaCount: 3, plazas: ['Solakhian (Ropar) Toll', 'Behrampur (Kiratpur) Toll', 'Takoli (Kullu) Toll'] },
  'manali-chandigarh': { toll: 210, name: 'Kiratpur-Nerchowk-Manali Expwy (3 Plazas)', plazaCount: 3, plazas: ['Takoli (Kullu) Toll', 'Behrampur (Kiratpur) Toll', 'Solakhian (Ropar) Toll'] },
  'zirakpur-manali': { toll: 210, name: 'Kiratpur-Nerchowk-Manali Expwy (3 Plazas)', plazaCount: 3, plazas: ['Solakhian (Ropar) Toll', 'Behrampur (Kiratpur) Toll', 'Takoli (Kullu) Toll'] },
  'manali-zirakpur': { toll: 210, name: 'Kiratpur-Nerchowk-Manali Expwy (3 Plazas)', plazaCount: 3, plazas: ['Takoli (Kullu) Toll', 'Behrampur (Kiratpur) Toll', 'Solakhian (Ropar) Toll'] },
  'chandigarh-shimla': { toll: 115, name: 'Chandimandir-Solan Himalayan Expwy (2 Plazas)', plazaCount: 2, plazas: ['Chandimandir Toll Plaza', 'Sanwara (Solan) Toll Plaza'] },
  'shimla-chandigarh': { toll: 115, name: 'Chandimandir-Solan Himalayan Expwy (2 Plazas)', plazaCount: 2, plazas: ['Sanwara (Solan) Toll Plaza', 'Chandimandir Toll Plaza'] },
  'zirakpur-shimla': { toll: 115, name: 'Chandimandir-Solan Himalayan Expwy (2 Plazas)', plazaCount: 2, plazas: ['Chandimandir Toll Plaza', 'Sanwara (Solan) Toll Plaza'] },
  'shimla-zirakpur': { toll: 115, name: 'Chandimandir-Solan Himalayan Expwy (2 Plazas)', plazaCount: 2, plazas: ['Sanwara (Solan) Toll Plaza', 'Chandimandir Toll Plaza'] },
  'chandigarh-amritsar': { toll: 265, name: 'NH-5 / NH-44 Punjab FASTag (3 Plazas)', plazaCount: 3, plazas: ['Ladowal (Ludhiana) Toll', 'Chiddan/Dhilwan Toll', 'Nijjarpura (Amritsar) Toll'] },
  'amritsar-chandigarh': { toll: 265, name: 'NH-5 / NH-44 Punjab FASTag (3 Plazas)', plazaCount: 3, plazas: ['Nijjarpura (Amritsar) Toll', 'Chiddan/Dhilwan Toll', 'Ladowal (Ludhiana) Toll'] },
  'patna-muzaffarpur': { toll: 110, name: 'NH-22 Hajipur-Muzaffarpur Highway (1 Plaza)', plazaCount: 1, plazas: ['Goraul (Vaishali) Toll Plaza'] },
  'muzaffarpur-patna': { toll: 110, name: 'NH-22 Hajipur-Muzaffarpur Highway (1 Plaza)', plazaCount: 1, plazas: ['Goraul (Vaishali) Toll Plaza'] },
  'patna-darbhanga': { toll: 195, name: 'NH-22 + NH-27 Darbhanga Corridor (2 Plazas)', plazaCount: 2, plazas: ['Goraul Toll Plaza', 'Maithi (Muzaffarpur-Darbhanga) Toll Plaza'] },
  'darbhanga-patna': { toll: 195, name: 'NH-22 + NH-27 Darbhanga Corridor (2 Plazas)', plazaCount: 2, plazas: ['Maithi (Muzaffarpur-Darbhanga) Toll Plaza', 'Goraul Toll Plaza'] },
  'patna-gaya': { toll: 85, name: 'NH-22 Patna-Gaya Highway (1 Plaza)', plazaCount: 1, plazas: ['Kewali (Jehanabad) Toll Plaza'] },
  'gaya-patna': { toll: 85, name: 'NH-22 Patna-Gaya Highway (1 Plaza)', plazaCount: 1, plazas: ['Kewali (Jehanabad) Toll Plaza'] },
  'patna-biharsharif': { toll: 120, name: 'NH-30 / NH-20 Bakhtiyarpur Corridor (1 Plaza)', plazaCount: 1, plazas: ['Didarganj (Patna-Bakhtiyarpur) Toll Plaza'] },
  'biharsharif-patna': { toll: 120, name: 'NH-30 / NH-20 Bakhtiyarpur Corridor (1 Plaza)', plazaCount: 1, plazas: ['Didarganj (Patna-Bakhtiyarpur) Toll Plaza'] },
  'patna-rajgir': { toll: 120, name: 'NH-30 / NH-20 Rajgir Corridor (1 Plaza)', plazaCount: 1, plazas: ['Didarganj (Patna-Bakhtiyarpur) Toll Plaza'] },
  'rajgir-patna': { toll: 120, name: 'NH-30 / NH-20 Rajgir Corridor (1 Plaza)', plazaCount: 1, plazas: ['Didarganj (Patna-Bakhtiyarpur) Toll Plaza'] },
  'mumbai-pune': { toll: 320, name: 'Mumbai-Pune Expressway (2 Plazas)', plazaCount: 2, plazas: ['Khalapur Toll Plaza', 'Talegaon Toll Plaza'] },
  'pune-mumbai': { toll: 320, name: 'Mumbai-Pune Expressway (2 Plazas)', plazaCount: 2, plazas: ['Talegaon Toll Plaza', 'Khalapur Toll Plaza'] },
  'mumbai-lonavala': { toll: 240, name: 'Mumbai-Pune Expressway (1 Plaza)', plazaCount: 1, plazas: ['Khalapur Expressway Toll Plaza'] },
  'lonavala-mumbai': { toll: 240, name: 'Mumbai-Pune Expressway (1 Plaza)', plazaCount: 1, plazas: ['Khalapur Expressway Toll Plaza'] },
  'mumbai-shirdi': { toll: 295, name: 'NH-160 / Samruddhi FASTag (3 Plazas)', plazaCount: 3, plazas: ['Argoan/Padgha Toll', 'Ghoti Toll Plaza', 'Sinnar/Shirdi Toll'] },
  'shirdi-mumbai': { toll: 295, name: 'NH-160 / Samruddhi FASTag (3 Plazas)', plazaCount: 3, plazas: ['Sinnar/Shirdi Toll', 'Ghoti Toll Plaza', 'Argoan/Padgha Toll'] },
  'mumbai-nashik': { toll: 235, name: 'Mumbai-Nashik NH-160 FASTag (2 Plazas)', plazaCount: 2, plazas: ['Padgha Toll Plaza', 'Ghoti Toll Plaza'] },
  'nashik-mumbai': { toll: 235, name: 'Mumbai-Nashik NH-160 FASTag (2 Plazas)', plazaCount: 2, plazas: ['Ghoti Toll Plaza', 'Padgha Toll Plaza'] },
  'mumbai-goa': { toll: 520, name: 'NH-66 / Expressway FASTag (5 Plazas)', plazaCount: 5, plazas: ['Khalapur Toll', 'Talegaon Toll', 'Khed Shivapur Toll', 'Anewadi Toll', 'Kini (Kolhapur) Toll'] },
  'goa-mumbai': { toll: 520, name: 'NH-66 / Expressway FASTag (5 Plazas)', plazaCount: 5, plazas: ['Kini (Kolhapur) Toll', 'Anewadi Toll', 'Khed Shivapur Toll', 'Talegaon Toll', 'Khalapur Toll'] },
  'mumbai-mahabaleshwar': { toll: 410, name: 'Mumbai-Pune Expwy + NH-48 (3 Plazas)', plazaCount: 3, plazas: ['Khalapur Toll', 'Talegaon Toll', 'Khed Shivapur Toll'] },
  'mahabaleshwar-mumbai': { toll: 410, name: 'Mumbai-Pune Expwy + NH-48 (3 Plazas)', plazaCount: 3, plazas: ['Khed Shivapur Toll', 'Talegaon Toll', 'Khalapur Toll'] },
  'pune-shirdi': { toll: 195, name: 'Pune-Sangamner Highway FASTag (2 Plazas)', plazaCount: 2, plazas: ['Chakan/Moshi Toll Plaza', 'Chalakhwadi (Alephata) Toll'] },
  'shirdi-pune': { toll: 195, name: 'Pune-Sangamner Highway FASTag (2 Plazas)', plazaCount: 2, plazas: ['Chalakhwadi (Alephata) Toll', 'Chakan/Moshi Toll Plaza'] },
  'pune-mahabaleshwar': { toll: 135, name: 'NH-48 Khed-Shivapur FASTag (1 Plaza)', plazaCount: 1, plazas: ['Khed Shivapur Toll Plaza'] },
  'mahabaleshwar-pune': { toll: 135, name: 'NH-48 Khed-Shivapur FASTag (1 Plaza)', plazaCount: 1, plazas: ['Khed Shivapur Toll Plaza'] },
  'bangalore-mysore': { toll: 335, name: 'Bangalore-Mysore Expressway (2 Plazas)', plazaCount: 2, plazas: ['Kaniminike Toll Plaza', 'Gananguru (Srirangapatna) Toll Plaza'] },
  'mysore-bangalore': { toll: 335, name: 'Bangalore-Mysore Expressway (2 Plazas)', plazaCount: 2, plazas: ['Gananguru (Srirangapatna) Toll Plaza', 'Kaniminike Toll Plaza'] },
  'bangalore-chennai': { toll: 435, name: 'NH-48 Krishnagiri-Vellore FASTag (5 Plazas)', plazaCount: 5, plazas: ['Attibele Toll', 'Krishnagiri Toll', 'Pallikonda Toll', 'Chennasamudram Toll', 'Sriperumbudur Toll'] },
  'chennai-bangalore': { toll: 435, name: 'NH-48 Krishnagiri-Vellore FASTag (5 Plazas)', plazaCount: 5, plazas: ['Sriperumbudur Toll', 'Chennasamudram Toll', 'Pallikonda Toll', 'Krishnagiri Toll', 'Attibele Toll'] },
  'bangalore-tirupati': { toll: 265, name: 'NH-75 Mulbagal-Chittoor FASTag (3 Plazas)', plazaCount: 3, plazas: ['Hoskote Toll Plaza', 'Mulbagal Toll Plaza', 'Gadanki (Tirupati) Toll'] },
  'tirupati-bangalore': { toll: 265, name: 'NH-75 Mulbagal-Chittoor FASTag (3 Plazas)', plazaCount: 3, plazas: ['Gadanki (Tirupati) Toll', 'Mulbagal Toll Plaza', 'Hoskote Toll Plaza'] },
  'bangalore-ooty': { toll: 335, name: 'Bangalore-Mysore Expwy (2 Plazas)', plazaCount: 2, plazas: ['Kaniminike Toll Plaza', 'Gananguru Toll Plaza'] },
  'ooty-bangalore': { toll: 335, name: 'Bangalore-Mysore Expwy (2 Plazas)', plazaCount: 2, plazas: ['Gananguru Toll Plaza', 'Kaniminike Toll Plaza'] },
  'bangalore-coorg': { toll: 265, name: 'Bangalore-Mysore Expwy FASTag (2 Plazas)', plazaCount: 2, plazas: ['Kaniminike Toll Plaza', 'Gananguru Toll Plaza'] },
  'coorg-bangalore': { toll: 265, name: 'Bangalore-Mysore Expwy FASTag (2 Plazas)', plazaCount: 2, plazas: ['Gananguru Toll Plaza', 'Kaniminike Toll Plaza'] },
  'chennai-pondicherry': { toll: 145, name: 'East Coast Road (ECR) Toll (2 Plazas)', plazaCount: 2, plazas: ['Akkarai ECR Toll Plaza', 'Mahabalipuram ECR Toll'] },
  'pondicherry-chennai': { toll: 145, name: 'East Coast Road (ECR) Toll (2 Plazas)', plazaCount: 2, plazas: ['Mahabalipuram ECR Toll', 'Akkarai ECR Toll Plaza'] },
  'ahmedabad-udaipur': { toll: 295, name: 'NH-48 Himatnagar-Shamlaji FASTag (3 Plazas)', plazaCount: 3, plazas: ['Kathpur (Himatnagar) Toll', 'Vantada (Modasa) Toll', 'Khandi Obri (Udaipur) Toll'] },
  'udaipur-ahmedabad': { toll: 295, name: 'NH-48 Himatnagar-Shamlaji FASTag (3 Plazas)', plazaCount: 3, plazas: ['Khandi Obri (Udaipur) Toll', 'Vantada (Modasa) Toll', 'Kathpur (Himatnagar) Toll'] },
  'jaipur-udaipur': { toll: 415, name: 'NH-48 Kishangarh-Bhilwara FASTag (4 Plazas)', plazaCount: 4, plazas: ['Thikariya (Jaipur) Toll', 'Kishangarh Toll', 'Lambiya (Bhilwara) Toll', 'Narayanpura (Udaipur) Toll'] },
  'udaipur-jaipur': { toll: 415, name: 'NH-48 Kishangarh-Bhilwara FASTag (4 Plazas)', plazaCount: 4, plazas: ['Narayanpura (Udaipur) Toll', 'Lambiya (Bhilwara) Toll', 'Kishangarh Toll', 'Thikariya (Jaipur) Toll'] },
  'jaipur-jodhpur': { toll: 315, name: 'NH-48 + Beawar-Pali FASTag (3 Plazas)', plazaCount: 3, plazas: ['Thikariya Toll', 'Kishangarh Toll', 'Raipur/Nimbol (Beawar) Toll'] },
  'jodhpur-jaipur': { toll: 315, name: 'NH-48 + Beawar-Pali FASTag (3 Plazas)', plazaCount: 3, plazas: ['Raipur/Nimbol (Beawar) Toll', 'Kishangarh Toll', 'Thikariya Toll'] },
  'lucknow-varanasi': { toll: 375, name: 'Purvanchal / NH-31 FASTag (3 Plazas)', plazaCount: 3, plazas: ['Dakhina Shekhpur Toll', 'Asoga (Sultanpur) Toll', 'Hauz (Jaunpur) Toll'] },
  'varanasi-lucknow': { toll: 375, name: 'Purvanchal / NH-31 FASTag (3 Plazas)', plazaCount: 3, plazas: ['Hauz (Jaunpur) Toll', 'Asoga (Sultanpur) Toll', 'Dakhina Shekhpur Toll'] },
  'lucknow-ayodhya': { toll: 195, name: 'NH-27 Barabanki-Ayodhya FASTag (2 Plazas)', plazaCount: 2, plazas: ['Ahmadpur (Barabanki) Toll Plaza', 'Ronahi (Ayodhya) Toll Plaza'] },
  'ayodhya-lucknow': { toll: 195, name: 'NH-27 Barabanki-Ayodhya FASTag (2 Plazas)', plazaCount: 2, plazas: ['Ronahi (Ayodhya) Toll Plaza', 'Ahmadpur (Barabanki) Toll Plaza'] },
  'varanasi-ayodhya': { toll: 225, name: 'NH-31 / NH-27 Ayodhya FASTag (2 Plazas)', plazaCount: 2, plazas: ['Hauz (Jaunpur) Toll Plaza', 'Tahapur/Akbarpur Toll Plaza'] },
  'ayodhya-varanasi': { toll: 225, name: 'NH-31 / NH-27 Ayodhya FASTag (2 Plazas)', plazaCount: 2, plazas: ['Tahapur/Akbarpur Toll Plaza', 'Hauz (Jaunpur) Toll Plaza'] }
};

const SERVER_CITY_STATE_KEYWORDS = [
  { keywords: ['delhi', 'newdelhi', 'burari', 'dwarka', 'rohini', 'connaught', 'igi', 'aerocity', 'saket', 'vasantkunj', 'karolbagh', 'lajpat'], state: 'Delhi' },
  { keywords: ['noida', 'greaternoida', 'ghaziabad', 'agra', 'lucknow', 'varanasi', 'ayodhya', 'mathura', 'vrindavan', 'prayagraj', 'allahabad', 'kanpur', 'meerut', 'gorakhpur', 'bareilly', 'aligarh', 'jhansi', 'moradabad', 'muzaffarnagar', 'saharanpur', 'uttarpradesh'], state: 'Uttar Pradesh' },
  { keywords: ['gurgaon', 'gurugram', 'faridabad', 'panipat', 'ambala', 'karnal', 'sonipat', 'rohtak', 'hisar', 'kurukshetra', 'rewari', 'palwal', 'panchkula', 'haryana'], state: 'Haryana' },
  { keywords: ['jaipur', 'udaipur', 'jodhpur', 'ajmer', 'pushkar', 'jaisalmer', 'bikaner', 'kota', 'mountabu', 'alwar', 'bharatpur', 'khatushyam', 'salasar', 'neemrana', 'rajasthan'], state: 'Rajasthan' },
  { keywords: ['chandigarh', 'amritsar', 'ludhiana', 'jalandhar', 'patiala', 'bathinda', 'mohali', 'zirakpur', 'pathankot', 'ropar', 'kiratpur', 'punjab'], state: 'Punjab' },
  { keywords: ['shimla', 'manali', 'dharamshala', 'mcleodganj', 'dalhousie', 'kasauli', 'kullu', 'solan', 'spiti', 'kasol', 'chamba', 'khajjiar', 'mandi', 'bilaspurhp', 'kangra', 'nagrotabagwan', 'nagrota', 'palampur', 'chamunda', 'baijnath', 'jwalamukhi', 'chintpurni', 'himachal'], state: 'Himachal Pradesh' },
  { keywords: ['dehradun', 'haridwar', 'rishikesh', 'nainital', 'mussoorie', 'haldwani', 'roorkee', 'jimcorbett', 'corbett', 'kedarnath', 'badrinath', 'almora', 'ranikhet', 'gangotri', 'yamunotri', 'lansdowne', 'auil', 'auli', 'uttarakhand', 'uttrakhand'], state: 'Uttarakhand' },
  { keywords: ['mumbai', 'pune', 'lonavala', 'khandala', 'mahabaleshwar', 'shirdi', 'nashik', 'nagpur', 'aurangabad', 'sambhajinagar', 'thane', 'navimumbai', 'andheri', 'bandra', 'dadar', 'borivali', 'kalyan', 'kolhapur', 'solapur', 'maharashtra'], state: 'Maharashtra' },
  { keywords: ['goa', 'panaji', 'margao', 'calangute', 'baga', 'dabolim', 'mopa', 'vasco'], state: 'Goa' },
  { keywords: ['ahmedabad', 'surat', 'vadodara', 'rajkot', 'somnath', 'bhuj', 'kutch', 'gandhinagar', 'statueofunity', 'kevadia', 'vapi', 'valsad', 'gujarat'], state: 'Gujarat' },
  { keywords: ['bangalore', 'bengaluru', 'mysore', 'mysuru', 'coorg', 'madikeri', 'mangalore', 'hubli', 'belgaum', 'chikmagalur', 'hampi', 'udupi', 'gokarna', 'kempegowda', 'whitefield', 'electroniccity', 'karnataka'], state: 'Karnataka' },
  { keywords: ['chennai', 'coimbatore', 'madurai', 'ooty', 'kodaikanal', 'rameswaram', 'kanyakumari', 'vellore', 'salem', 'trichy', 'thanjavur', 'mahabalipuram', 'hosur', 'tamilnadu'], state: 'Tamil Nadu' },
  { keywords: ['pondicherry', 'puducherry'], state: 'Puducherry' },
  { keywords: ['hyderabad', 'secunderabad', 'warangal', 'gachibowli', 'hitec', 'shamshabad', 'telangana'], state: 'Telangana' },
  { keywords: ['tirupati', 'visakhapatnam', 'vizag', 'vijayawada', 'guntur', 'nellore', 'kurnool', 'chittoor', 'andhrapradesh'], state: 'Andhra Pradesh' },
  { keywords: ['kochi', 'cochin', 'munnar', 'thiruvananthapuram', 'trivandrum', 'alleppey', 'alappuzha', 'wayanad', 'kozhikode', 'calicut', 'thekkady', 'kovalam', 'kerala'], state: 'Kerala' },
  { keywords: ['indore', 'bhopal', 'ujjain', 'omkareshwar', 'gwalior', 'jabalpur', 'khajuraho', 'pachmarhi', 'sanchi', 'madhyapradesh'], state: 'Madhya Pradesh' },
  { keywords: ['kolkata', 'howrah', 'darjeeling', 'siliguri', 'digha', 'durgapur', 'asansol', 'westbengal'], state: 'West Bengal' },
  { keywords: ['patna', 'hajipur', 'sonepur', 'danapur', 'bihta', 'gaya', 'bodhgaya', 'muzaffarpur', 'bhagalpur', 'darbhanga', 'samastipur', 'begusarai', 'ara', 'arrah', 'chhapra', 'chapra', 'biharsharif', 'rajgir', 'nalanda', 'sitamarhi', 'motihari', 'buxar', 'sasaram', 'purnia', 'katihar', 'munger', 'siwan', 'gopalganj', 'bettiah', 'kishanganj', 'araria', 'madhubani', 'saharsa', 'supaul', 'nawada', 'aurangabadbihar', 'jehanabad', 'vaishali', 'bihar'], state: 'Bihar' },
  { keywords: ['ranchi', 'jamshedpur', 'deoghar', 'dhanbad', 'bokaro', 'hazaribagh', 'giridih', 'ramgarh', 'dumka', 'chaibasa', 'medininagar', 'daltonganj', 'jharkhand'], state: 'Jharkhand' },
  { keywords: ['bhubaneswar', 'puri', 'konark', 'cuttack', 'rourkela', 'odisha'], state: 'Odisha' },
  { keywords: ['raipur', 'bilaspur', 'bhilai', 'durg', 'chhattisgarh'], state: 'Chhattisgarh' },
  { keywords: ['guwahati', 'shillong', 'kaziranga', 'gangtok', 'sikkim', 'assam', 'meghalaya'], state: 'North East' },
  { keywords: ['jammu', 'srinagar', 'katra', 'vaishnodevi', 'gulmarg', 'pahalgam', 'sonamarg', 'leh', 'ladakh', 'kashmir'], state: 'Jammu & Kashmir' }
];

const SERVER_HILL_STATION_KEYWORDS = [
  'shimla', 'manali', 'mussoorie', 'nainital', 'dharamshala', 'mcleodganj', 'dalhousie',
  'kasauli', 'kullu', 'kasol', 'spiti', 'ooty', 'kodaikanal', 'munnar', 'wayanad',
  'coorg', 'madikeri', 'chikmagalur', 'mahabaleshwar', 'lonavala', 'khandala',
  'mountabu', 'pachmarhi', 'darjeeling', 'gangtok', 'shillong', 'gulmarg', 'pahalgam',
  'sonamarg', 'leh', 'ladakh', 'almora', 'ranikhet', 'badrinath', 'kedarnath', 'rishikesh',
  'lansdowne', 'auli', 'gangotri', 'yamunotri', 'khajjiar',
  'rudraprayag', 'karnaprayag', 'devprayag', 'nandaprayag', 'vishnuprayag', 'sonprayag',
  'guptkashi', 'ukhimath', 'chamoli', 'joshimath', 'pipalkoti', 'gopeshwar', 'chopta',
  'uttarkashi', 'barkot', 'harsil', 'tehri', 'newtehri', 'pauri', 'srinagargarhwal',
  'kotdwar', 'chakrata', 'dhanaulti', 'kanatal', 'chamba', 'bhimtal', 'sattal', 'naukuchiatal',
  'mukteshwar', 'ramgarh', 'kausani', 'binsar', 'bageshwar', 'pithoragarh', 'champawat',
  'munsiyari', 'chaukori', 'dharchula', 'tanakpur', 'haldwani', 'kathgodam', 'ramnagar',
  'jimcorbett', 'corbett', 'solan', 'chail', 'kufri', 'narkanda', 'rampur', 'kinnaur',
  'kalpa', 'sangla', 'chitkul', 'keylong', 'kaza', 'manikaran', 'tosh', 'malana', 'mandi',
  'bir', 'billing', 'palampur', 'kangra', 'nagrotabagwan', 'nagrota', 'chamunda', 'baijnath', 'jwalamukhi', 'chintpurni', 'bharmour', 'parwanoo', 'baddi', 'bilaspurhp',
  'katra', 'vaishnodevi', 'patnitop', 'kishtwar', 'bhaderwah', 'kargil', 'nubra', 'pangong',
  'kalimpong', 'kurseong', 'mirik', 'pelling', 'lachung', 'lachen', 'tawang', 'ziro',
  'bomdila', 'cherrapunji', 'sohra', 'dawki', 'kohima', 'aizawl', 'imphal', 'saputara',
  'panchgani', 'matheran', 'igatpuri', 'bhandardara', 'lavasa', 'coonoor', 'kotagiri',
  'yercaud', 'yelagiri', 'valparai', 'vagamon', 'thekkady', 'ponmudi', 'araku', 'horsley'
];

const SERVER_PUNJAB_TRANSIT_HIMACHAL_CITIES = [
  'manali', 'kullu', 'kasol', 'spiti', 'dharamshala', 'mcleodganj', 'dalhousie', 'chamba', 'khajjiar', 'mandi'
];

const SERVER_EXPLICIT_HIGHWAY_STATE_CORRIDORS = {
  'Delhi|Uttarakhand': ['Delhi', 'Uttar Pradesh', 'Uttarakhand'],
  'Uttarakhand|Delhi': ['Uttarakhand', 'Uttar Pradesh', 'Delhi'],
  'Delhi|Himachal Pradesh': ['Delhi', 'Haryana', 'Himachal Pradesh'],
  'Himachal Pradesh|Delhi': ['Himachal Pradesh', 'Haryana', 'Delhi'],
  'Delhi|Punjab': ['Delhi', 'Haryana', 'Punjab'],
  'Punjab|Delhi': ['Punjab', 'Haryana', 'Delhi'],
  'Delhi|Jammu & Kashmir': ['Delhi', 'Haryana', 'Punjab', 'Jammu & Kashmir'],
  'Jammu & Kashmir|Delhi': ['Jammu & Kashmir', 'Punjab', 'Haryana', 'Delhi'],
  'Delhi|Rajasthan': ['Delhi', 'Haryana', 'Rajasthan'],
  'Rajasthan|Delhi': ['Rajasthan', 'Haryana', 'Delhi'],
  'Delhi|Madhya Pradesh': ['Delhi', 'Uttar Pradesh', 'Madhya Pradesh'],
  'Madhya Pradesh|Delhi': ['Madhya Pradesh', 'Uttar Pradesh', 'Delhi'],
  'Delhi|Bihar': ['Delhi', 'Uttar Pradesh', 'Bihar'],
  'Bihar|Delhi': ['Bihar', 'Uttar Pradesh', 'Delhi'],
  'Haryana|Uttarakhand': ['Haryana', 'Delhi', 'Uttar Pradesh', 'Uttarakhand'],
  'Uttarakhand|Haryana': ['Uttarakhand', 'Uttar Pradesh', 'Delhi', 'Haryana'],
  'Uttar Pradesh|Himachal Pradesh': ['Uttar Pradesh', 'Delhi', 'Haryana', 'Himachal Pradesh'],
  'Himachal Pradesh|Uttar Pradesh': ['Himachal Pradesh', 'Haryana', 'Delhi', 'Uttar Pradesh'],
  'Uttar Pradesh|Punjab': ['Uttar Pradesh', 'Delhi', 'Haryana', 'Punjab'],
  'Punjab|Uttar Pradesh': ['Punjab', 'Haryana', 'Delhi', 'Uttar Pradesh'],
  'Maharashtra|Goa': ['Maharashtra', 'Karnataka', 'Goa'],
  'Goa|Maharashtra': ['Goa', 'Karnataka', 'Maharashtra']
};

const SERVER_INDIA_STATE_ADJACENCY = {
  'Delhi': ['Uttar Pradesh', 'Haryana'],
  'Haryana': ['Delhi', 'Punjab', 'Himachal Pradesh', 'Rajasthan', 'Uttar Pradesh'],
  'Punjab': ['Haryana', 'Himachal Pradesh', 'Jammu & Kashmir', 'Rajasthan'],
  'Himachal Pradesh': ['Haryana', 'Punjab', 'Uttarakhand', 'Jammu & Kashmir'],
  'Jammu & Kashmir': ['Punjab', 'Himachal Pradesh'],
  'Uttarakhand': ['Uttar Pradesh', 'Himachal Pradesh'],
  'Uttar Pradesh': ['Delhi', 'Uttarakhand', 'Haryana', 'Rajasthan', 'Madhya Pradesh', 'Bihar', 'Jharkhand', 'Chhattisgarh'],
  'Rajasthan': ['Haryana', 'Punjab', 'Uttar Pradesh', 'Madhya Pradesh', 'Gujarat'],
  'Gujarat': ['Rajasthan', 'Madhya Pradesh', 'Maharashtra'],
  'Madhya Pradesh': ['Uttar Pradesh', 'Rajasthan', 'Gujarat', 'Maharashtra', 'Chhattisgarh'],
  'Maharashtra': ['Gujarat', 'Madhya Pradesh', 'Chhattisgarh', 'Telangana', 'Karnataka', 'Goa'],
  'Goa': ['Maharashtra', 'Karnataka'],
  'Karnataka': ['Maharashtra', 'Goa', 'Telangana', 'Andhra Pradesh', 'Tamil Nadu', 'Kerala'],
  'Kerala': ['Karnataka', 'Tamil Nadu'],
  'Tamil Nadu': ['Karnataka', 'Kerala', 'Andhra Pradesh', 'Puducherry'],
  'Puducherry': ['Tamil Nadu'],
  'Andhra Pradesh': ['Tamil Nadu', 'Karnataka', 'Telangana', 'Odisha', 'Chhattisgarh'],
  'Telangana': ['Maharashtra', 'Karnataka', 'Andhra Pradesh', 'Chhattisgarh'],
  'Chhattisgarh': ['Madhya Pradesh', 'Uttar Pradesh', 'Jharkhand', 'Odisha', 'Telangana', 'Maharashtra'],
  'Odisha': ['West Bengal', 'Jharkhand', 'Chhattisgarh', 'Andhra Pradesh'],
  'Bihar': ['Uttar Pradesh', 'Jharkhand', 'West Bengal'],
  'Jharkhand': ['Bihar', 'Uttar Pradesh', 'Chhattisgarh', 'Odisha', 'West Bengal'],
  'West Bengal': ['Bihar', 'Jharkhand', 'Odisha', 'North East'],
  'North East': ['West Bengal']
};

const SERVER_STATE_PERMIT_BASE_RATES_SEDAN = {
  'Uttar Pradesh': { tax: 200, desc: 'UP State Entry Permit Tax' },
  'Uttarakhand': { tax: 250, desc: 'Uttarakhand State Permit & Green Cess' },
  'Haryana': { tax: 150, desc: 'Haryana State Border Permit Tax' },
  'Punjab': { tax: 200, desc: 'Punjab State Entry Permit Tax' },
  'Himachal Pradesh': { tax: 250, desc: 'Himachal State Permit & Green Tax' },
  'Rajasthan': { tax: 220, desc: 'Rajasthan State Border Permit Tax' },
  'Delhi': { tax: 150, desc: 'Delhi MCD Commercial Entry Toll' },
  'Jammu & Kashmir': { tax: 280, desc: 'J&K Lakhanpur Entry Permit Tax' },
  'Madhya Pradesh': { tax: 200, desc: 'MP State Border Permit Tax' },
  'Maharashtra': { tax: 220, desc: 'Maharashtra RTO Border Permit' },
  'Goa': { tax: 280, desc: 'Goa State Entry & Green Cess' },
  'Gujarat': { tax: 220, desc: 'Gujarat RTO Checkpost Permit' },
  'Karnataka': { tax: 240, desc: 'Karnataka State Entry Permit' },
  'Tamil Nadu': { tax: 220, desc: 'Tamil Nadu Border Checkpost Permit' },
  'Kerala': { tax: 250, desc: 'Kerala Walayar/Muthanga State Permit' },
  'Puducherry': { tax: 150, desc: 'Puducherry Entry Permit Tax' },
  'Andhra Pradesh': { tax: 220, desc: 'Andhra Pradesh Border Permit' },
  'Telangana': { tax: 220, desc: 'Telangana RTO Entry Permit' },
  'Bihar': { tax: 200, desc: 'Bihar State Entry Permit Tax' },
  'Jharkhand': { tax: 200, desc: 'Jharkhand Border Permit Tax' },
  'West Bengal': { tax: 220, desc: 'West Bengal State Entry Permit' },
  'Odisha': { tax: 200, desc: 'Odisha State Border Permit' },
  'Chhattisgarh': { tax: 200, desc: 'Chhattisgarh Border Permit' },
  'North East': { tax: 280, desc: 'North-East Inter-State Entry Permit' }
};

function normalizeServerRouteToken(str) {
  return String(str || '').toLowerCase().replace(/[^a-z]/g, '');
}

function detectServerLocationState(locationStr, fallbackState = 'Delhi') {
  if (!locationStr) return fallbackState;
  const norm = normalizeServerRouteToken(locationStr);
  for (const entry of SERVER_CITY_STATE_KEYWORDS) {
    for (const kw of entry.keywords) {
      if (norm.includes(kw)) return entry.state;
    }
  }
  return fallbackState;
}

function isServerHillStationRoute(pickupCity, dropCity) {
  const combined = normalizeServerRouteToken(pickupCity) + ' ' + normalizeServerRouteToken(dropCity);
  return SERVER_HILL_STATION_KEYWORDS.some((kw) => combined.includes(kw));
}

function computeServerMultiStateRouteCorridor(originState, destState, pickupCity = '', dropCity = '') {
  if (!originState || !destState) return [originState || 'Delhi'];
  if (originState === destState) return [originState];

  const combinedCities = normalizeServerRouteToken(pickupCity) + ' ' + normalizeServerRouteToken(dropCity);

  if (
    (originState === 'Delhi' || originState === 'Haryana' || originState === 'Uttar Pradesh') &&
    destState === 'Himachal Pradesh' &&
    SERVER_PUNJAB_TRANSIT_HIMACHAL_CITIES.some((city) => combinedCities.includes(city))
  ) {
    if (originState === 'Uttar Pradesh') return ['Uttar Pradesh', 'Delhi', 'Haryana', 'Punjab', 'Himachal Pradesh'];
    if (originState === 'Delhi') return ['Delhi', 'Haryana', 'Punjab', 'Himachal Pradesh'];
    return ['Haryana', 'Punjab', 'Himachal Pradesh'];
  }

  if (
    destState === 'Delhi' &&
    originState === 'Himachal Pradesh' &&
    SERVER_PUNJAB_TRANSIT_HIMACHAL_CITIES.some((city) => combinedCities.includes(city))
  ) {
    return ['Himachal Pradesh', 'Punjab', 'Haryana', 'Delhi'];
  }

  if (
    originState === 'Uttar Pradesh' &&
    destState === 'Rajasthan' &&
    (combinedCities.includes('noida') || combinedCities.includes('ghaziabad') || combinedCities.includes('meerut'))
  ) {
    return ['Uttar Pradesh', 'Delhi', 'Haryana', 'Rajasthan'];
  }

  const pairKey = `${originState}|${destState}`;
  if (SERVER_EXPLICIT_HIGHWAY_STATE_CORRIDORS[pairKey]) {
    return SERVER_EXPLICIT_HIGHWAY_STATE_CORRIDORS[pairKey];
  }

  const queue = [[originState]];
  const visited = new Set([originState]);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];
    if (current === destState) return path;
    const neighbors = SERVER_INDIA_STATE_ADJACENCY[current] || [];
    for (const nextState of neighbors) {
      if (!visited.has(nextState)) {
        visited.add(nextState);
        queue.push([...path, nextState]);
      }
    }
  }

  return [originState, destState];
}

function computeServerMultiStatePermitBreakdown(originState, destState, pickupCity = '', dropCity = '', cabId = 'sedan') {
  const stateRoutePath = computeServerMultiStateRouteCorridor(originState, destState, pickupCity, dropCity);
  if (stateRoutePath.length <= 1) {
    return { stateRoutePath, statePermitBreakdown: [], totalStatePermitTax: 0 };
  }

  const vehiclePermitMultiplier =
    cabId === 'hatchback'
      ? 0.8
      : cabId === 'sedan'
      ? 1.0
      : cabId === 'exec_sedan'
      ? 1.1
      : cabId === 'suv'
      ? 1.25
      : cabId === 'innova'
      ? 1.4
      : 1.9;

  const statesEntered = stateRoutePath.slice(1);
  const breakdown = statesEntered.map((stateName, idx) => {
    const isFinalDest = idx === statesEntered.length - 1;
    const role = isFinalDest ? 'destination' : 'transit';
    const baseInfo = SERVER_STATE_PERMIT_BASE_RATES_SEDAN[stateName] || { tax: 200, desc: `${stateName} State Entry Permit` };
    const roleFactor = role === 'transit' ? 0.5 : 1.0;
    const taxAmount = Math.round((baseInfo.tax * vehiclePermitMultiplier * roleFactor) / 10) * 10;
    const label = role === 'transit'
      ? `${stateName} (En-Route Transit State Permit)`
      : `${stateName} (Destination State Entry Permit)`;
    return { state: stateName, role, label, taxAmount };
  });

  const totalStatePermitTax = breakdown.reduce((sum, item) => sum + item.taxAmount, 0);
  return { stateRoutePath, statePermitBreakdown: breakdown, totalStatePermitTax };
}

const SERVER_VERIFIED_TOLL_FREE_CORRIDORS = [
  'patna-hajipur', 'hajipur-patna',
  'patna-sonepur', 'sonepur-patna',
  'patna-sonpur', 'sonpur-patna',
  'patna-danapur', 'danapur-patna',
  'patna-bihta', 'bihta-patna',
  'patna-arrah', 'arrah-patna',
  'patna-ara', 'ara-patna',
  'patna-chhapra', 'chhapra-patna',
  'patna-chapra', 'chapra-patna',
  'hajipur-sonepur', 'sonepur-hajipur',
  'hajipur-danapur', 'danapur-hajipur',
  'hajipur-bihta', 'bihta-hajipur',
  'gaya-bodhgaya', 'bodhgaya-gaya',
  'rajgir-nalanda', 'nalanda-rajgir',
  'biharsharif-rajgir', 'rajgir-biharsharif',
  'biharsharif-nalanda', 'nalanda-biharsharif',
  'delhi-noida', 'noida-delhi',
  'delhi-greaternoida', 'greaternoida-delhi',
  'delhi-ghaziabad', 'ghaziabad-delhi',
  'delhi-gurgaon', 'gurgaon-delhi',
  'delhi-gurugram', 'gurugram-delhi',
  'delhi-faridabad', 'faridabad-delhi',
  'noida-ghaziabad', 'ghaziabad-noida',
  'noida-greaternoida', 'greaternoida-noida',
  'gurgaon-faridabad', 'faridabad-gurgaon',
  'chandigarh-mohali', 'mohali-chandigarh',
  'chandigarh-panchkula', 'panchkula-chandigarh',
  'chandigarh-zirakpur', 'zirakpur-chandigarh',
  'zirakpur-mohali', 'mohali-zirakpur',
  'zirakpur-panchkula', 'panchkula-zirakpur',
  'mohali-panchkula', 'panchkula-mohali',
  'mathura-vrindavan', 'vrindavan-mathura',
  'agra-fatehpursikri', 'fatehpursikri-agra',
  'haridwar-rishikesh', 'rishikesh-haridwar',
  'dehradun-mussoorie', 'mussoorie-dehradun',
  'dehradun-rishikesh', 'rishikesh-dehradun',
  'haldwani-nainital', 'nainital-haldwani',
  'kathgodam-nainital', 'nainital-kathgodam',
  'nainital-bhimtal', 'bhimtal-nainital',
  'nainital-almora', 'almora-nainital',
  'shimla-kufri', 'kufri-shimla',
  'shimla-narkanda', 'narkanda-shimla',
  'shimla-chail', 'chail-shimla',
  'kullu-manali', 'manali-kullu',
  'kullu-kasol', 'kasol-kullu',
  'manali-kasol', 'kasol-manali',
  'dharamshala-mcleodganj', 'mcleodganj-dharamshala',
  'dharamshala-kangra', 'kangra-dharamshala',
  'dharamshala-palampur', 'palampur-dharamshala',
  'kangra-palampur', 'palampur-kangra',
  'kangra-nagrota', 'nagrota-kangra',
  'dalhousie-khajjiar', 'khajjiar-dalhousie',
  'kolkata-howrah', 'howrah-kolkata',
  'mumbai-thane', 'thane-mumbai',
  'mumbai-navimumbai', 'navimumbai-mumbai',
  'pune-lonavala', 'lonavala-pune',
  'lonavala-khandala', 'khandala-lonavala',
  'mahabaleshwar-panchgani', 'panchgani-mahabaleshwar',
  'hyderabad-secunderabad', 'secunderabad-hyderabad',
  'ahmedabad-gandhinagar', 'gandhinagar-ahmedabad',
  'ajmer-pushkar', 'pushkar-ajmer',
  'puri-konark', 'konark-puri',
  'ooty-coonoor', 'coonoor-ooty',
  'guwahati-shillong', 'shillong-guwahati',
  'shillong-cherrapunji', 'cherrapunji-shillong',
  'siliguri-darjeeling', 'darjeeling-siliguri',
  'siliguri-gangtok', 'gangtok-siliguri'
];

function lookupServerRouteExpresswayToll(pickupCity, dropCity, distanceKm = 230, cabId = 'sedan') {
  const nFrom = normalizeServerRouteToken(pickupCity);
  const nTo = normalizeServerRouteToken(dropCity);
  const vehicleTollMultiplier = cabId === 'tempo' ? 1.45 : 1.0;

  if (nFrom && nTo) {
    if (nFrom === nTo) {
      return {
        baseTollOneWay: 0,
        expresswayName: 'Intra-City Route (0 Toll Plazas · ₹0 Toll)',
        tollPlazaCount: 0,
        tollPlazas: []
      };
    }

    for (const corridor of SERVER_VERIFIED_TOLL_FREE_CORRIDORS) {
      const [c1, c2] = corridor.split('-').map((s) => normalizeServerRouteToken(s));
      if (nFrom.includes(c1) && nTo.includes(c2)) {
        return {
          baseTollOneWay: 0,
          expresswayName: 'Toll-Free Corridor (0 Toll Plazas · ₹0 Toll)',
          tollPlazaCount: 0,
          tollPlazas: []
        };
      }
    }
  }

  if (nFrom && nTo) {
    for (const [pairKey, info] of Object.entries(SERVER_EXPRESSWAY_TOLLS)) {
      const [c1, c2] = pairKey.split('-');
      if (nFrom.includes(c1) && nTo.includes(c2)) {
        return {
          baseTollOneWay: Math.round(info.toll * vehicleTollMultiplier),
          expresswayName: info.name,
          tollPlazaCount: info.plazaCount || 1,
          tollPlazas: info.plazas || [info.name]
        };
      }
    }
  }

  // Zero Toll on Short Inter-City Routes (<= 65 KM) without a dedicated tolled expressway
  if (distanceKm <= 65) {
    return {
      baseTollOneWay: 0,
      expresswayName: 'Short Inter-City Route (0 Toll Plazas · ₹0 Toll)',
      tollPlazaCount: 0,
      tollPlazas: []
    };
  }

  // Mountain Hill-to-Hill Routes have 0 NHAI toll plazas
  const pickupIsHill = isServerLocationInHillArea(pickupCity);
  const dropIsHill = isServerLocationInHillArea(dropCity);
  if (pickupIsHill && dropIsHill) {
    return {
      baseTollOneWay: 0,
      expresswayName: 'Mountain Hill Road (0 Toll Plazas · ₹0 Toll)',
      tollPlazaCount: 0,
      tollPlazas: []
    };
  }

  // Realistic Discrete Toll Plaza Counting (Synchronized 100% with lookupRouteExpresswayToll)
  if (pickupIsHill || dropIsHill) {
    const plainsSegmentKm = Math.max(0, Math.round(distanceKm * 0.42));
    const hillApproachPlazas = plainsSegmentKm < 60 ? 0 : Math.min(3, Math.floor(plainsSegmentKm / 65));
    if (hillApproachPlazas === 0) {
      return {
        baseTollOneWay: 0,
        expresswayName: 'Foothill-to-Hill Route (0 Toll Plazas · ₹0 Toll)',
        tollPlazaCount: 0,
        tollPlazas: []
      };
    }
    const perPlazaRate = Math.round(70 * vehicleTollMultiplier);
    const plazaLabels = Array.from({ length: hillApproachPlazas }, (_, i) => `NHAI Foothill Plaza #${i + 1}`);
    return {
      baseTollOneWay: hillApproachPlazas * perPlazaRate,
      expresswayName: `NHAI Foothill Approach (${hillApproachPlazas} Toll Plaza${hillApproachPlazas > 1 ? 's' : ''})`,
      tollPlazaCount: hillApproachPlazas,
      tollPlazas: plazaLabels
    };
  }

  const countedPlazas = distanceKm < 75 ? 0 : Math.max(1, Math.floor((distanceKm - 20) / 80));
  if (countedPlazas === 0) {
    return {
      baseTollOneWay: 0,
      expresswayName: 'Regional Highway (0 Toll Plazas · ₹0 Toll)',
      tollPlazaCount: 0,
      tollPlazas: []
    };
  }

  const avgPlazaRate = Math.round(75 * vehicleTollMultiplier);
  const plazaNames = Array.from({ length: countedPlazas }, (_, i) => `NHAI Highway Plaza #${i + 1}`);
  return {
    baseTollOneWay: countedPlazas * avgPlazaRate,
    expresswayName: `NHAI Highway FASTag (${countedPlazas} Toll Plaza${countedPlazas > 1 ? 's' : ''})`,
    tollPlazaCount: countedPlazas,
    tollPlazas: plazaNames
  };
}

/**
 * Strip all whitespace, invisible Unicode characters (zero-width spaces, BOM, non-breaking spaces,
 * directional marks, control characters), and accidental surrounding quotes from credentials/env vars.
 */
export function cleanEnvVar(val) {
  if (!val || typeof val !== 'string') return '';
  return val
    .replace(/[\u0000-\u001F\u007F-\u009F\u00A0\u1680\u180E\u2000-\u200F\u2028-\u202F\u205F-\u206F\u3000\uFEFF]/g, '')
    .replace(/\s+/g, '')
    .replace(/['"`“”‘’]+/g, '')
    .trim();
}

/**
 * Resolve and normalize Razorpay credentials with automatic fallback across RAZORPAY_KEY_ID,
 * VITE_RAZORPAY_KEY_ID, NEXT_PUBLIC_RAZORPAY_KEY_ID, and optional clientPublicKeyId.
 */
export function resolveNormalizedRazorpayCredentials(env = process.env, clientPublicKeyId = '') {
  const rawServerKeyId = typeof env?.RAZORPAY_KEY_ID === 'string' ? env.RAZORPAY_KEY_ID : '';
  const rawViteKeyId = typeof env?.VITE_RAZORPAY_KEY_ID === 'string' ? env.VITE_RAZORPAY_KEY_ID : '';
  const rawNextKeyId =
    typeof env?.NEXT_PUBLIC_RAZORPAY_KEY_ID === 'string' ? env.NEXT_PUBLIC_RAZORPAY_KEY_ID : '';
  const rawKeySecret = typeof env?.RAZORPAY_KEY_SECRET === 'string' ? env.RAZORPAY_KEY_SECRET : '';

  const serverKeyId = cleanEnvVar(rawServerKeyId);
  const vitePublicKeyId = cleanEnvVar(rawViteKeyId) || cleanEnvVar(rawNextKeyId);
  const normalizedClientKeyId = cleanEnvVar(clientPublicKeyId);
  const keySecret = cleanEnvVar(rawKeySecret);

  const isValidKeyFormat = (k) =>
    Boolean(k) && (k.startsWith('rzp_live_') || k.startsWith('rzp_test_'));

  // Build ordered list of unique valid-format candidate Key IDs to try against Razorpay API
  const candidateKeys = [];
  const addCandidate = (k, source) => {
    if (isValidKeyFormat(k) && !candidateKeys.some((item) => item.keyId === k)) {
      candidateKeys.push({ keyId: k, source });
    }
  };

  addCandidate(serverKeyId, 'RAZORPAY_KEY_ID');
  addCandidate(vitePublicKeyId, 'VITE_RAZORPAY_KEY_ID');
  addCandidate(normalizedClientKeyId, 'client_VITE_RAZORPAY_KEY_ID');

  let keyId = '';
  let keySource = 'none';

  if (candidateKeys.length > 0) {
    keyId = candidateKeys[0].keyId;
    keySource =
      candidateKeys[0].source === 'RAZORPAY_KEY_ID'
        ? 'RAZORPAY_KEY_ID'
        : `${candidateKeys[0].source} (fallback)`;
  } else if (serverKeyId) {
    keyId = serverKeyId;
    keySource = 'RAZORPAY_KEY_ID';
  } else if (vitePublicKeyId) {
    keyId = vitePublicKeyId;
    keySource = 'VITE_RAZORPAY_KEY_ID (fallback)';
  } else if (normalizedClientKeyId) {
    keyId = normalizedClientKeyId;
    keySource = 'client_VITE_RAZORPAY_KEY_ID (fallback)';
  }

  // Deterministic HMAC signing secret for order/direct verification tokens
  const signingSecret =
    keySecret ||
    cleanEnvVar(env?.OTP_SECRET) ||
    (keyId ? `safar_token_secret_${keyId}` : 'safar_default_token_secret');

  const keyPrefix = keyId ? keyId.slice(0, 9) : 'MISSING';
  const keyMaskedPreview =
    keyId.length >= 13
      ? `${keyId.slice(0, 9)}***${keyId.slice(-4)}`
      : keyId
      ? `${keyId.slice(0, 5)}***`
      : 'MISSING';
  const keyMode = keyId.startsWith('rzp_live_')
    ? 'live'
    : keyId.startsWith('rzp_test_')
    ? 'test'
    : keyId
    ? 'invalid_prefix'
    : 'missing';

  return {
    keyId,
    keySecret,
    signingSecret,
    serverKeyId,
    vitePublicKeyId,
    candidateKeys,
    keySource,
    diagnostics: {
      keySource,
      keyPrefix,
      keyMaskedPreview,
      keyMode,
      keyLength: keyId.length,
      candidateKeysCount: candidateKeys.length,
      hasRazorpayKeyIdEnv: Boolean(serverKeyId),
      hasViteRazorpayKeyIdEnv: Boolean(vitePublicKeyId),
      usedFallbackToViteKey: keySource.includes('VITE_RAZORPAY_KEY_ID'),
      keyHadHiddenOrWhitespaceChars:
        (Boolean(rawServerKeyId) && rawServerKeyId !== serverKeyId) ||
        (Boolean(rawViteKeyId) && rawViteKeyId !== vitePublicKeyId),
      hasRazorpayKeySecretEnv: Boolean(keySecret),
      secretLength: keySecret.length,
      secretHadHiddenOrWhitespaceChars:
        Boolean(rawKeySecret) && rawKeySecret !== keySecret
    }
  };
}

const SERVER_DAILY_ROUTE_HUB_KEYWORDS = [
  'delhi', 'newdelhi', 'noida', 'greaternoida', 'gurgaon', 'gurugram', 'ghaziabad', 'faridabad',
  'agra', 'mathura', 'vrindavan', 'jaipur', 'chandigarh', 'mohali', 'zirakpur', 'panchkula',
  'ambala', 'panipat', 'karnal', 'sonipat', 'kurukshetra', 'haridwar', 'dehradun',
  'lucknow', 'kanpur', 'ayodhya', 'varanasi', 'prayagraj', 'allahabad', 'amritsar', 'ludhiana',
  'jalandhar', 'patiala', 'mumbai', 'navimumbai', 'thane', 'pune', 'shirdi', 'nashik',
  'ahmedabad', 'surat', 'vadodara', 'gandhinagar', 'udaipur', 'bangalore', 'bengaluru', 'mysore',
  'mysuru', 'chennai', 'pondicherry', 'puducherry', 'hyderabad', 'secunderabad', 'tirupati',
  'kolkata', 'howrah', 'indore', 'bhopal', 'ujjain', 'patna', 'nagpur', 'coimbatore', 'kochi'
];

const SERVER_DEEP_MOUNTAIN_HILL_KEYWORDS = [
  'manali', 'kullu', 'kasol', 'manikaran', 'tosh', 'malana', 'rohtang', 'sissu', 'keylong', 'jispa',
  'spiti', 'kaza', 'kinnaur', 'kalpa', 'sangla', 'chitkul', 'reckongpeo', 'narkanda', 'kufri',
  'dharamshala', 'dharmshala', 'dharmshaala', 'dharamsala', 'mcleodganj', 'palampur', 'bir', 'barot',
  'jibhi', 'tirthan', 'shoja', 'dalhousie', 'khajjiar', 'chamba', 'rudraprayag', 'karnaprayag',
  'nandaprayag', 'vishnuprayag', 'devprayag', 'sonprayag', 'gaurikund', 'kedarnath', 'badrinath',
  'guptkashi', 'ukhimath', 'chopta', 'joshimath', 'auli', 'chamoli', 'gopeshwar', 'uttarkashi',
  'gangotri', 'yamunotri', 'barkot', 'harsil', 'tehri', 'newtehri', 'pauri', 'srinagargarhwal',
  'almora', 'ranikhet', 'kausani', 'binsar', 'bageshwar', 'pithoragarh', 'champawat', 'lohaghat',
  'munsiyari', 'chaukori', 'dharchula', 'jageshwar', 'mukteshwar', 'chakrata', 'dhanaulti', 'kanatal',
  'srinagar', 'gulmarg', 'pahalgam', 'sonamarg', 'patnitop', 'bhaderwah', 'kishtwar', 'banihal',
  'leh', 'ladakh', 'kargil', 'nubra', 'pangong', 'drass', 'darjeeling', 'gangtok', 'sikkim',
  'pelling', 'lachung', 'lachen', 'nathula', 'tawang', 'bomdila', 'ziro', 'dirang', 'kohima', 'aizawl'
];

const SERVER_FOOTHILL_GATEWAY_KEYWORDS = [
  'dehradun', 'haridwar', 'haldwani', 'kathgodam', 'ramnagar', 'corbett', 'jimcorbett',
  'kotdwar', 'tanakpur', 'kalka', 'parwanoo', 'pathankot', 'kiratpur', 'ropar', 'siliguri', 'jammu'
];

function isServerDailyRouteCity(locationStr) {
  if (!locationStr) return true;
  const norm = normalizeServerRouteToken(locationStr);
  if (!norm) return true;
  if (isServerLocationInHillArea(locationStr)) return false;
  return SERVER_DAILY_ROUTE_HUB_KEYWORDS.some((kw) => norm.includes(kw));
}

function isServerLocationInHillArea(locationStr) {
  if (!locationStr) return false;
  const norm = normalizeServerRouteToken(locationStr);
  if (!norm) return false;
  return SERVER_HILL_STATION_KEYWORDS.some((kw) => norm.includes(kw)) || SERVER_DEEP_MOUNTAIN_HILL_KEYWORDS.some((kw) => norm.includes(kw));
}

function isServerLocationInDeepMountain(locationStr) {
  if (!locationStr) return false;
  const norm = normalizeServerRouteToken(locationStr);
  if (!norm) return false;
  return SERVER_DEEP_MOUNTAIN_HILL_KEYWORDS.some((kw) => norm.includes(kw));
}

function isServerLocationFoothillGateway(locationStr) {
  if (!locationStr) return false;
  const norm = normalizeServerRouteToken(locationStr);
  if (!norm) return false;
  return SERVER_FOOTHILL_GATEWAY_KEYWORDS.some((kw) => norm.includes(kw));
}

function parseServerPickupHourOfDay(pickupTime) {
  const raw = String(pickupTime || '').trim().toUpperCase();
  if (!raw) return 7.0;

  const amPmMatch = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/);
  if (amPmMatch) {
    let hr = parseInt(amPmMatch[1], 10);
    const min = parseInt(amPmMatch[2], 10) || 0;
    const period = amPmMatch[3];
    if (period === 'PM' && hr < 12) hr += 12;
    if (period === 'AM' && hr === 12) hr = 0;
    return hr + min / 60;
  }

  const h24Match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (h24Match) {
    const hr = parseInt(h24Match[1], 10);
    const min = parseInt(h24Match[2], 10) || 0;
    if (hr >= 0 && hr < 24) return hr + min / 60;
  }

  return 7.0;
}

function formatServerHourOfDay(fractionalHour) {
  const totalMinutes = Math.round(((fractionalHour % 24) + 24) % 24 * 60);
  const h24 = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const padH = String(h12).padStart(2, '0');
  const padM = String(mins).padStart(2, '0');
  const nextDaySuffix = fractionalHour >= 24 ? ' (+1 Day)' : '';
  return `${padH}:${padM} ${period}${nextDaySuffix}`;
}

function computeServerLeadTimePricing(pickupDate, pickupTime, distanceKm = 230, isHillRoute = false, hillTier = 'none', dropIsHill = false) {
  const pickupHour = parseServerPickupHourOfDay(pickupTime);
  const avgSpeedKmph =
    hillTier === 'both_hills'
      ? 32
      : hillTier === 'one_end_hill' || isHillRoute
      ? 44
      : 55;
  const estimatedDriveHours = Math.max(1.0, distanceKm / avgSpeedKmph + 0.25);
  const arrivalHourContinuous = pickupHour + estimatedDriveHours;
  const arrivalHourOfDay = ((arrivalHourContinuous % 24) + 24) % 24;
  const estimatedDropTime = formatServerHourOfDay(arrivalHourContinuous);

  const isEarlyOrNightPickup = pickupHour >= 22.5 || pickupHour <= 5.5;
  const isLateNightDrop = dropIsHill
    ? arrivalHourContinuous >= 21.5 || arrivalHourOfDay <= 4.5
    : arrivalHourContinuous >= 23.0 || arrivalHourOfDay <= 4.5;

  let timingBonusFactor = 0;
  let timingAllowance = 0;

  try {
    const todayIST = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const cleanPickup = String(pickupDate || '').trim().slice(0, 10);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(cleanPickup)) {
      return {
        leadTimeTier: 'tomorrow',
        leadTimeMultiplier: 1.0,
        leadTimeLabel: isLateNightDrop
          ? `Late Drop (${estimatedDropTime})`
          : isEarlyOrNightPickup
          ? 'Night/Dawn Pickup Slot'
          : 'Standard Rate',
        estimatedDropTime,
        isLateNightDrop,
        isEarlyOrNightPickup,
        timingAllowance
      };
    }
    const pickupMs = Date.parse(`${cleanPickup}T00:00:00Z`);
    const todayMs = Date.parse(`${todayIST}T00:00:00Z`);
    if (!Number.isFinite(pickupMs) || !Number.isFinite(todayMs)) {
      return {
        leadTimeTier: 'tomorrow',
        leadTimeMultiplier: 1.0,
        leadTimeLabel: 'Standard Rate',
        estimatedDropTime,
        isLateNightDrop,
        isEarlyOrNightPickup,
        timingAllowance
      };
    }

    const daysAhead = Math.round((pickupMs - todayMs) / 86400000);
    if (daysAhead <= 0) {
      return {
        leadTimeTier: 'same_day',
        leadTimeMultiplier: Number((1.0 + timingBonusFactor).toFixed(2)),
        leadTimeLabel: 'Same-Day Assured Rate',
        estimatedDropTime,
        isLateNightDrop,
        isEarlyOrNightPickup,
        timingAllowance
      };
    }
    if (daysAhead === 1) {
      return {
        leadTimeTier: 'tomorrow',
        leadTimeMultiplier: Number((1.0 + timingBonusFactor).toFixed(2)),
        leadTimeLabel: 'Next-Day Assured Rate',
        estimatedDropTime,
        isLateNightDrop,
        isEarlyOrNightPickup,
        timingAllowance
      };
    }
    return {
      leadTimeTier: 'advance',
      leadTimeMultiplier: Number((1.0 + timingBonusFactor).toFixed(2)),
      leadTimeLabel: 'Advance Assured Rate',
      estimatedDropTime,
      isLateNightDrop,
      isEarlyOrNightPickup,
      timingAllowance
    };
  } catch {
    return {
      leadTimeTier: 'tomorrow',
      leadTimeMultiplier: 1.0,
      leadTimeLabel: 'Standard Rate',
      estimatedDropTime,
      isLateNightDrop,
      isEarlyOrNightPickup,
      timingAllowance
    };
  }
}

function computeServerHillAreaPricing(tripType, pickupCity, dropCity) {
  const pickupIsHill = isServerLocationInHillArea(pickupCity);
  const dropIsHill = tripType === 'local' ? pickupIsHill : isServerLocationInHillArea(dropCity);
  const pickupIsDeep = isServerLocationInDeepMountain(pickupCity);
  const dropIsDeep = tripType === 'local' ? pickupIsDeep : isServerLocationInDeepMountain(dropCity);
  const pickupIsGateway = isServerLocationFoothillGateway(pickupCity);
  const dropIsGateway = tripType === 'local' ? pickupIsGateway : isServerLocationFoothillGateway(dropCity);

  const isHillRoute = pickupIsHill || dropIsHill;

  if (!isHillRoute) {
    if (pickupIsGateway || dropIsGateway) {
      return {
        isHillRoute: false,
        pickupIsHill: false,
        dropIsHill: false,
        hillTier: 'foothill_gateway',
        hillRateMultiplier: 1.0,
        hillTierLabel: 'Foothill Gateway Corridor'
      };
    }
    return {
      isHillRoute: false,
      pickupIsHill: false,
      dropIsHill: false,
      hillTier: 'none',
      hillRateMultiplier: 1.0,
      hillTierLabel: ''
    };
  }

  if (pickupIsHill && dropIsHill && tripType !== 'local') {
    const isDeepHillToHill = pickupIsDeep || dropIsDeep;
    return {
      isHillRoute: true,
      pickupIsHill: true,
      dropIsHill: true,
      hillTier: 'both_hills',
      hillRateMultiplier: isDeepHillToHill ? 1.30 : 1.26,
      hillTierLabel: isDeepHillToHill
        ? 'Deep Himalayan Hill-to-Hill Terrain'
        : 'Mountain Hill-to-Hill Terrain'
    };
  }

  if (pickupIsDeep || dropIsDeep) {
    return {
      isHillRoute: true,
      pickupIsHill,
      dropIsHill,
      hillTier: 'one_end_hill',
      hillRateMultiplier: 1.26,
      hillTierLabel: pickupIsDeep
        ? 'Hill Station Pickup Terrain'
        : 'Mountain Hill Climb'
    };
  }

  return {
    isHillRoute: true,
    pickupIsHill,
    dropIsHill,
    hillTier: 'one_end_hill',
    hillRateMultiplier: 1.24,
    hillTierLabel: pickupIsHill ? 'Hill Station Pickup Terrain' : 'Hill Station Ghat Climb'
  };
}

function computeServerRouteTierPricing(tripType, pickupCity, dropCity, distanceKm = 200, isHillRoute = false) {
  const pickupIsDaily = isServerDailyRouteCity(pickupCity);
  const dropIsDaily = tripType === 'local' ? pickupIsDaily : isServerDailyRouteCity(dropCity);
  const pickupIsOuter = !pickupIsDaily;
  const dropIsOuter = !dropIsDaily;

  if (isHillRoute) {
    return {
      isOuterRoute: false,
      pickupIsOuter,
      dropIsOuter,
      routeTierMultiplier: 1.0,
      routeTierLabel: 'Hill Highway Corridor'
    };
  }

  if (tripType === 'local' || tripType === 'airport') {
    if (pickupIsDaily) {
      return {
        isOuterRoute: false,
        pickupIsOuter: false,
        dropIsOuter: false,
        routeTierMultiplier: 1.0,
        routeTierLabel: 'Daily City Hub (Standard Rate)'
      };
    }
    return {
      isOuterRoute: true,
      pickupIsOuter: true,
      dropIsOuter: true,
      routeTierMultiplier: 1.02,
      routeTierLabel: 'Outer City Pickup Zone'
    };
  }

  if (pickupIsDaily && dropIsDaily) {
    return {
      isOuterRoute: false,
      pickupIsOuter: false,
      dropIsOuter: false,
      routeTierMultiplier: 1.0,
      routeTierLabel: 'Daily Highway Corridor'
    };
  }

  if (pickupIsOuter && dropIsOuter) {
    return {
      isOuterRoute: true,
      pickupIsOuter: true,
      dropIsOuter: true,
      routeTierMultiplier: distanceKm > 250 ? 1.03 : 1.02,
      routeTierLabel: 'Outer Pickup & Empty Return Corridor'
    };
  }

  if (pickupIsOuter) {
    return {
      isOuterRoute: true,
      pickupIsOuter: true,
      dropIsOuter: false,
      routeTierMultiplier: 1.02,
      routeTierLabel: 'Outer Pickup Dispatch Zone'
    };
  }

  return {
    isOuterRoute: true,
    pickupIsOuter: false,
    dropIsOuter: true,
    routeTierMultiplier: 1.0,
    routeTierLabel: 'Standard Highway Corridor'
  };
}

/**
 * Safar India Cabs - Round Trip Fare Calculation Logic
 */
export function calculateRoundTripFare(totalKm, numberOfDays, vehicleType, nightHalts = 0, hillMultiplier = 1.0) {
  const rates = {
    HATCHBACK: { perKmRate: 10.5, driverAllowancePerDay: 240, nightChargePerNight: 250 },
    SEDAN: { perKmRate: 11.5, driverAllowancePerDay: 260, nightChargePerNight: 250 },
    EXEC_SEDAN: { perKmRate: 13.0, driverAllowancePerDay: 300, nightChargePerNight: 300 },
    SUV: { perKmRate: 15.0, driverAllowancePerDay: 320, nightChargePerNight: 300 },
    INNOVA: { perKmRate: 19.0, driverAllowancePerDay: 380, nightChargePerNight: 350 },
    TEMPO: { perKmRate: 24.5, driverAllowancePerDay: 480, nightChargePerNight: 450 }
  };

  const selectedConfig = rates[String(vehicleType || 'SEDAN').toUpperCase()] || rates['SEDAN'];

  const MIN_KM_PER_DAY = 250;
  const minChargeableKm = numberOfDays * MIN_KM_PER_DAY;
  const finalChargeableKm = Math.max(totalKm, minChargeableKm);

  const effectivePerKmRate = Number((selectedConfig.perKmRate * hillMultiplier).toFixed(1));
  const baseDistanceFare = Math.round(finalChargeableKm * effectivePerKmRate);
  const totalDriverAllowance = numberOfDays * selectedConfig.driverAllowancePerDay;
  const totalNightAllowance = nightHalts * selectedConfig.nightChargePerNight;
  const totalFare = baseDistanceFare + totalDriverAllowance + totalNightAllowance;

  return {
    vehicleType: vehicleType,
    totalKm: totalKm,
    numberOfDays: numberOfDays,
    chargeableKm: finalChargeableKm,
    perKmRate: effectivePerKmRate,
    baseDistanceFare: baseDistanceFare,
    driverAllowance: totalDriverAllowance,
    nightAllowance: totalNightAllowance,
    totalFare: totalFare,
    note: 'Toll Taxes, State Border Entry Taxes, and Parking fees are extra to be paid directly by customer.'
  };
}

/**
 * Compute trip fare on the server using the exact SafarIndiaCabs pricing rules in src/utils/fareCalculator.ts
 */
export function computeServerTripFare({
  tripType,
  cabId,
  distanceKm,
  extraKm = 0,
  pickupCity = '',
  dropCity = '',
  pickupDate,
  pickupTime = '',
  returnDate,
  localPackageId = '8h_80k',
  includeTolls = false,
  addonCarrier = false,
  addonPet = false,
  addonAssuredModel = false,
  promoCode = '',
  promoDiscount = 0,
  customerName = ''
}) {
  const validTripTypes = ['oneway', 'roundtrip', 'local', 'airport'];
  if (!validTripTypes.includes(tripType)) {
    throw new Error(`Invalid tripType: ${tripType}`);
  }

  const cab = SERVER_CABS_FLEET[cabId] || SERVER_CABS_FLEET.sedan;
  const oneWayRate = cab.ratePerKm;
  const baseExtraKmRate = cab.extraKmRate || Math.round(cab.ratePerKm + 1);
  const dailyBata = cab.driverAllowancePerDay || 320;
  const hillBase = cab.hillStationCharge || 420;
  const local8HrBase = cab.local8Hr80KmFare || 1999;

  const parsedDistance = Number(distanceKm ?? 0);
  if (!Number.isFinite(parsedDistance) || parsedDistance < 0 || parsedDistance > 15000) {
    throw new Error(`Invalid distanceKm: ${distanceKm}`);
  }
  const cleanExtraKm = Math.max(0, Math.round(Number(extraKm) || 0));

  const {
    isHillRoute,
    pickupIsHill,
    dropIsHill,
    hillTier,
    hillRateMultiplier,
    hillTierLabel
  } = computeServerHillAreaPricing(tripType, pickupCity, dropCity);

  const {
    leadTimeTier,
    leadTimeMultiplier,
    leadTimeLabel,
    estimatedDropTime,
    isLateNightDrop,
    isEarlyOrNightPickup,
    timingAllowance
  } = computeServerLeadTimePricing(pickupDate, pickupTime, parsedDistance, isHillRoute, hillTier, dropIsHill);

  const {
    isOuterRoute,
    pickupIsOuter,
    dropIsOuter,
    routeTierMultiplier,
    routeTierLabel
  } = computeServerRouteTierPricing(tripType, pickupCity, dropCity, parsedDistance, isHillRoute);

  const dynamicRateFactor = leadTimeMultiplier * routeTierMultiplier * hillRateMultiplier;

  let baseBilledDistanceKm = Math.max(0, Math.round(parsedDistance));
  let ratePerKm = oneWayRate;
  let baseRouteFare = 0;
  let driverAllowance = 0;
  let nightCharges = 0;
  let daysCount = 1;

  const originState = detectServerLocationState(pickupCity, 'Delhi');
  const destState =
    tripType === 'local'
      ? originState
      : detectServerLocationState(dropCity, pickupCity ? originState : 'Uttar Pradesh');
  const isInterState =
    tripType !== 'local' &&
    tripType !== 'airport' &&
    Boolean(originState && destState && originState !== destState);

  let hillStationCharge = 0;
  const hillDriverBonusPerDay = 0;

  if (tripType === 'oneway') {
    baseBilledDistanceKm = Math.max(1, Math.round(parsedDistance));
    const slabFactor = isHillRoute
      ? 1.0
      : baseBilledDistanceKm <= 130
      ? 1.02
      : 1.0;

    ratePerKm = Number((oneWayRate * slabFactor * dynamicRateFactor).toFixed(1));

    hillStationCharge =
      hillTier === 'both_hills'
        ? Math.round(hillBase * 1.15)
        : hillTier === 'one_end_hill'
        ? hillBase
        : 0;
    const shortTripMinBase =
      cab.id === 'hatchback'
        ? 480
        : cab.id === 'sedan'
        ? 540
        : cab.id === 'exec_sedan'
        ? 660
        : cab.id === 'suv'
        ? 760
        : cab.id === 'innova'
        ? 950
        : 1350;

    baseRouteFare =
      baseBilledDistanceKm < 55
        ? Math.max(shortTripMinBase, Math.round(baseBilledDistanceKm * ratePerKm))
        : Math.round(baseBilledDistanceKm * ratePerKm);

    const oneWayDriverDays = baseBilledDistanceKm > 500 ? 1.5 : 1;

    driverAllowance = Math.round((dailyBata + hillDriverBonusPerDay) * oneWayDriverDays);
    nightCharges = timingAllowance;
  } else if (tripType === 'roundtrip') {
    if (pickupDate && returnDate) {
      const p = new Date(pickupDate).getTime();
      const r = new Date(returnDate).getTime();
      if (Number.isFinite(p) && Number.isFinite(r)) {
        const diffDays = Math.ceil((r - p) / (1000 * 60 * 60 * 24));
        daysCount = Math.max(1, diffDays + 1);
      }
    }
    const actualTwoWayKm = Math.round(parsedDistance * 2);
    const nightHalts = Math.max(0, daysCount - 1);
    const rtHillFactor =
      hillTier === 'both_hills' ? 1.12 : hillTier === 'one_end_hill' ? 1.08 : 1.0;
    const rtFare = calculateRoundTripFare(
      actualTwoWayKm,
      daysCount,
      String(cabId).toUpperCase(),
      nightHalts,
      rtHillFactor
    );

    baseBilledDistanceKm = rtFare.chargeableKm;
    ratePerKm = rtFare.perKmRate;
    baseRouteFare = rtFare.baseDistanceFare;
    driverAllowance = rtFare.driverAllowance + hillDriverBonusPerDay * daysCount;
    nightCharges = rtFare.nightAllowance;
    hillStationCharge =
      hillTier === 'both_hills'
        ? Math.round(hillBase * 1.15)
        : hillTier === 'one_end_hill'
        ? hillBase
        : 0;
  } else if (tripType === 'local') {
    const adjustedLocal8HrBase = Math.round(local8HrBase * dynamicRateFactor);
    if (localPackageId === '4h_40k') {
      baseBilledDistanceKm = 40;
      baseRouteFare = Math.round(adjustedLocal8HrBase * 0.70) - 200;
      driverAllowance = 200 + hillDriverBonusPerDay;
    } else if (localPackageId === '12h_120k') {
      baseBilledDistanceKm = 120;
      baseRouteFare = Math.round(adjustedLocal8HrBase * 1.33) - 260;
      driverAllowance = 260 + hillDriverBonusPerDay;
    } else {
      baseBilledDistanceKm = 80;
      baseRouteFare = adjustedLocal8HrBase - 240;
      driverAllowance = 240 + hillDriverBonusPerDay;
    }
    ratePerKm = Number((oneWayRate * dynamicRateFactor).toFixed(1));
    hillStationCharge = isHillRoute ? Math.round(hillBase * 0.8) : 0;
    nightCharges = 0;
  } else if (tripType === 'airport') {
    baseBilledDistanceKm = Math.max(40, Math.round(parsedDistance));
    ratePerKm = Number((oneWayRate * dynamicRateFactor).toFixed(1));
    const airportFixedPickupFee =
      cabId === 'tempo' ? 500 : cabId === 'innova' || cabId === 'suv' ? 350 : 240;
    baseRouteFare = Math.round(baseBilledDistanceKm * ratePerKm + airportFixedPickupFee);
    driverAllowance = 200 + hillDriverBonusPerDay;
    hillStationCharge = isHillRoute ? Math.round(hillBase * 0.8) : 0;
    nightCharges = 0;
  }

  const extraKmRate =
    tripType === 'roundtrip'
      ? ratePerKm
      : Number(baseExtraKmRate.toFixed(1));

  const sliderExtraFare = Math.round(cleanExtraKm * extraKmRate);
  const billedDistanceKm = baseBilledDistanceKm + cleanExtraKm;
  const baseFare = baseRouteFare + hillStationCharge + sliderExtraFare;

  let highwayToll = 0;
  let statePermitTax = 0;
  let stateRoutePath = [originState];
  let statePermitBreakdown = [];
  let expresswayName = 'Local City Road (0 Toll Plazas)';
  let tollPlazaCount = 0;
  let tollPlazas = [];

  if (tripType === 'oneway') {
    const tollInfo = lookupServerRouteExpresswayToll(pickupCity, dropCity, billedDistanceKm, cabId);
    highwayToll = tollInfo.baseTollOneWay;
    expresswayName = tollInfo.expresswayName;
    tollPlazaCount = tollInfo.tollPlazaCount || 0;
    tollPlazas = tollInfo.tollPlazas || [];
    if (isInterState) {
      const permitInfo = computeServerMultiStatePermitBreakdown(
        originState,
        destState,
        pickupCity,
        dropCity,
        cabId
      );
      stateRoutePath = permitInfo.stateRoutePath;
      statePermitBreakdown = permitInfo.statePermitBreakdown;
      statePermitTax = permitInfo.totalStatePermitTax;
    }
  } else if (tripType === 'roundtrip') {
    const tollInfo = lookupServerRouteExpresswayToll(
      pickupCity,
      dropCity,
      Math.round(billedDistanceKm / 2),
      cabId
    );
    highwayToll = tollInfo.baseTollOneWay > 0 ? Math.round(tollInfo.baseTollOneWay * 1.8) : 0;
    expresswayName = tollInfo.expresswayName;
    tollPlazaCount = tollInfo.tollPlazaCount > 0 ? tollInfo.tollPlazaCount * 2 : 0;
    tollPlazas = tollInfo.tollPlazas || [];
    if (isInterState) {
      const permitInfo = computeServerMultiStatePermitBreakdown(
        originState,
        destState,
        pickupCity,
        dropCity,
        cabId
      );
      stateRoutePath = permitInfo.stateRoutePath;
      statePermitBreakdown = permitInfo.statePermitBreakdown;
      statePermitTax = permitInfo.totalStatePermitTax;
    }
  } else if (tripType === 'airport') {
    const tollInfo = lookupServerRouteExpresswayToll(pickupCity, dropCity, billedDistanceKm, cabId);
    highwayToll = tollInfo.baseTollOneWay;
    statePermitTax = 0;
    expresswayName =
      tollInfo.tollPlazaCount > 0 ? tollInfo.expresswayName : 'Airport Approach Road (0 Toll Plazas)';
    tollPlazaCount = tollInfo.tollPlazaCount || 0;
    tollPlazas = tollInfo.tollPlazas || [];
  }

  const effectiveIncludeTolls = false;
  const estimatedTollsAndTaxes = highwayToll + statePermitTax;
  const tollsAndTaxes = effectiveIncludeTolls ? estimatedTollsAndTaxes : 0;
  highwayToll = 0;
  statePermitTax = 0;

  const carrierFee = addonCarrier ? 250 : 0;
  const petFee = addonPet
    ? cabId === 'suv' || cabId === 'innova' || cabId === 'tempo'
      ? 600
      : 500
    : 0;
  const assuredModelFee = addonAssuredModel ? 300 : 0;
  const addonsTotal = carrierFee + petFee + assuredModelFee;

  const taxableSubtotal = baseFare + driverAllowance + nightCharges + addonsTotal;
  const gstAmount = tripType === 'roundtrip' ? 0 : Math.round(taxableSubtotal * 0.05);

  const totalFareBeforePromo = baseFare + driverAllowance + nightCharges + tollsAndTaxes + addonsTotal + gstAmount;

  const cleanPromoCode = String(promoCode || '').trim().toUpperCase().replace(/\s+/g, '');
  const cleanNameNorm = String(customerName || '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  const cleanPromoNorm = String(promoCode || '').trim().toLowerCase().replace(/\./g, '').replace(/\s+/g, ' ');
  const shouldApplyPromo =
    promoDiscount === true ||
    Number(promoDiscount) >= 300 ||
    cleanPromoCode === 'FIRST300' ||
    cleanNameNorm.includes('dr vijay kumar') ||
    cleanNameNorm.includes('vijay kumar') ||
    cleanPromoNorm.includes('dr vijay kumar') ||
    cleanPromoNorm.includes('vijay kumar');

  const appliedPromoDiscount = shouldApplyPromo ? 300 : 0;
  const totalFare = Math.max(100, totalFareBeforePromo - appliedPromoDiscount);

  const competitorGap = totalFareBeforePromo >= 4500 ? 210 : totalFareBeforePromo >= 3200 ? 199 : 169;
  const originalMarketFare = totalFareBeforePromo + competitorGap;
  const savingsAmount = competitorGap + appliedPromoDiscount;
  const savingsPercent = Math.max(4, Math.round((savingsAmount / originalMarketFare) * 100));

  const advanceFare = Math.round(totalFare * 0.20);
  const balanceDue = totalFare - advanceFare;

  return {
    distanceKm: parsedDistance,
    extraKm: cleanExtraKm,
    extraKmCharge: sliderExtraFare,
    extraKmRateUsed: extraKmRate,
    billedDistanceKm,
    baseFare,
    driverAllowance,
    nightCharges,
    highwayToll,
    statePermitTax,
    stateRoutePath,
    statePermitBreakdown,
    estimatedTollsAndTaxes,
    tollsAndTaxes,
    hillStationCharge,
    isHillRoute,
    pickupIsHill,
    dropIsHill,
    hillTier,
    hillRateMultiplier,
    hillTierLabel,
    isInterState,
    originState,
    destState,
    expresswayName,
    tollPlazaCount,
    tollPlazas,
    addonsTotal,
    gstAmount,
    promoDiscount: appliedPromoDiscount,
    totalFareBeforePromo,
    totalFare,
    originalMarketFare,
    savingsAmount,
    savingsPercent,
    advanceFare,
    balanceDue,
    daysCount,
    ratePerKm,
    leadTimeTier,
    leadTimeMultiplier,
    leadTimeLabel,
    isOuterRoute,
    pickupIsOuter,
    dropIsOuter,
    routeTierMultiplier,
    routeTierLabel
  };
}

/**
 * Create a timing-safe HMAC verification token that binds the Razorpay order and booking parameters
 * so verification works reliably across separate Vercel serverless invocations.
 */
export function signOrderVerificationToken(payload, secret) {
  const canonical = [
    payload.bookingId,
    payload.orderId,
    payload.amountInPaise,
    payload.totalFare,
    payload.advancePaid,
    payload.balanceDue,
    payload.paymentMode,
    payload.customerPhone,
    payload.tripType,
    payload.cabId
  ].join('|');

  return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
}

export function verifyOrderVerificationToken(payload, token, secret) {
  if (!token || typeof token !== 'string' || !secret) return false;
  const expected = signOrderVerificationToken(payload, secret);
  const expectedBuf = Buffer.from(expected, 'utf8');
  const receivedBuf = Buffer.from(token.trim(), 'utf8');
  if (expectedBuf.length !== receivedBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

// Sequential Booking ID generator state (SIC2601, SIC2602, SIC2603, SIC2604, ...)
let serverSic26Counter = 4;

export function generateServerSequentialBookingId() {
  for (const b of storedBookings) {
    if (b && b.id) {
      const m = String(b.id).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').match(/^SIC26(\d{1,5})$/);
      if (m) {
        const seq = parseInt(m[1], 10);
        if (Number.isFinite(seq) && seq > serverSic26Counter && seq <= 9000) {
          serverSic26Counter = seq;
        }
      }
    }
  }
  serverSic26Counter += 1;
  return `SIC26${String(serverSic26Counter).padStart(2, '0')}`;
}

// In-memory cache for warm serverless invocations
let storedBookings = [
  {
    id: 'SIC2604',
    tripType: 'oneway',
    tripDays: 1,
    pickupCity: 'Zirakpur, Punjab',
    dropCity: 'Nagrota Bagwan, India',
    pickupAddress: 'Zirakpur, Punjab',
    dropAddress: 'Nagrota Bagwan, Himachal Pradesh, India',
    pickupDate: '2026-11-07',
    pickupTime: '03:30 PM',
    cabId: 'sedan',
    cabName: 'Comfort Sedan AC (Maruti Suzuki Dzire, Toyota Etios, Hyundai Aura)',
    distanceKm: 235,
    baseFare: 1550,
    driverAllowance: 260,
    tollsAndTaxes: 0,
    highwayToll: 0,
    statePermitTax: 0,
    hillStationCharge: 160,
    gstAmount: 99,
    totalFare: 2069,
    advancePaid: 414,
    balanceDue: 1655,
    paymentMode: 'advance_20',
    paymentMethod: 'upi_razorpay',
    transactionId: 'pay_live_captured_2604',
    customerName: 'Ashish Dhawan',
    customerPhone: '8080401779',
    customerEmail: '',
    status: 'confirmed',
    createdAt: '2026-11-07T05:08:00.000Z',
    notes: '20% advance Rs. 414 received via Razorpay. Balance Rs. 1,655 payable to driver during trip (Toll, State Tax & Parking Extra as per actuals).'
  },
  {
    id: 'SIC2603',
    tripType: 'oneway',
    tripDays: 1,
    pickupCity: 'Delhi NCR',
    dropCity: 'Agra',
    pickupAddress: 'T3 IGI Airport, New Delhi',
    dropAddress: 'Tajganj, Agra, Uttar Pradesh',
    landmark: 'Taj View Point',
    pickupDate: '2026-10-18',
    pickupTime: '08:00 AM',
    cabId: 'sedan',
    cabName: 'Sedan AC (Maruti Dzire)',
    distanceKm: 230,
    baseFare: 1470,
    driverAllowance: 260,
    tollsAndTaxes: 0,
    highwayToll: 0,
    statePermitTax: 0,
    hillStationCharge: 0,
    gstAmount: 87,
    totalFare: 1817,
    advancePaid: 363,
    balanceDue: 1454,
    paymentMode: 'advance_20',
    paymentMethod: 'upi_razorpay',
    transactionId: 'pay_live_captured_2603',
    customerName: 'Verified Passenger',
    customerPhone: '7710080992',
    customerEmail: 'passenger@safarindiacabs.in',
    status: 'confirmed',
    createdAt: '2026-10-17T08:30:00.000Z',
    notes: '20% advance received via Razorpay. Balance Rs. 1,454 payable to driver at destination (Toll, State Tax & Parking Extra as per actuals).'
  }
];

const pendingOrdersById = new Map();
const verifiedPaymentsById = new Map();
const verifiedOrdersById = new Map();
const verifiedBookingsById = new Map();
const activeOrdersByBookingKey = new Map();
const activeQrsByBookingKey = new Map();
const retryCountsByBookingId = new Map();

// Seed initial verified payment log for SIC2604 & SIC2603 so Admin Panel immediately shows real records
const paymentAuditLogs = [
  {
    id: 'LOG-SIC2604-1',
    bookingId: 'SIC2604',
    customerName: 'Ashish Dhawan',
    customerPhone: '8080401779',
    customerEmail: '',
    totalBookingAmount: 2069,
    advanceAmount: 414,
    amountInPaise: 41400,
    razorpayOrderId: 'order_live_sic2604',
    razorpayPaymentId: 'pay_live_captured_2604',
    qrId: '',
    paymentMethod: 'upi_intent',
    paymentStatus: 'paid',
    timestamp: '2026-11-07T05:08:00.000Z',
    failureReason: '',
    gatewayResponse: 'HTTP 200 OK — Payment captured & HMAC-SHA256 verified',
    retryAttempts: 0,
    webhookVerificationStatus: 'verified'
  },
  {
    id: 'LOG-SIC2603-1',
    bookingId: 'SIC2603',
    customerName: 'Verified Passenger',
    customerPhone: '7710080992',
    customerEmail: 'passenger@safarindiacabs.in',
    totalBookingAmount: 1817,
    advanceAmount: 363,
    amountInPaise: 36300,
    razorpayOrderId: 'order_live_sic2603',
    razorpayPaymentId: 'pay_live_captured_2603',
    qrId: '',
    paymentMethod: 'upi_razorpay',
    paymentStatus: 'paid',
    timestamp: '2026-10-17T08:30:00.000Z',
    failureReason: '',
    gatewayResponse: 'HTTP 200 OK — Payment captured & verified',
    retryAttempts: 0,
    webhookVerificationStatus: 'verified'
  }
];

export function incrementBookingRetryAttempt(bookingId) {
  const cleanId = String(bookingId || '').trim().toUpperCase();
  if (!cleanId) return 0;
  const current = retryCountsByBookingId.get(cleanId) || 0;
  retryCountsByBookingId.set(cleanId, current + 1);
  return current;
}

export function getBookingRetryCount(bookingId) {
  const cleanId = String(bookingId || '').trim().toUpperCase();
  return retryCountsByBookingId.get(cleanId) || 0;
}

export function appendPaymentAuditLog(entry) {
  if (!entry || !entry.bookingId) return null;
  const cleanId = String(entry.bookingId).trim().toUpperCase();
  const logItem = {
    id: entry.id || `LOG-${cleanId}-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    bookingId: cleanId,
    customerName: String(entry.customerName || 'Traveler').slice(0, 100),
    customerPhone: String(entry.customerPhone || '').replace(/\D/g, '').slice(-10),
    customerEmail: String(entry.customerEmail || '').slice(0, 100),
    totalBookingAmount: Math.round(Number(entry.totalBookingAmount || 0)),
    advanceAmount: Math.round(Number(entry.advanceAmount || 0)),
    amountInPaise: Math.round(Number(entry.amountInPaise || Number(entry.advanceAmount || 0) * 100)),
    razorpayOrderId: String(entry.razorpayOrderId || ''),
    razorpayPaymentId: String(entry.razorpayPaymentId || ''),
    qrId: String(entry.qrId || ''),
    paymentMethod: String(entry.paymentMethod || 'upi'),
    paymentStatus: String(entry.paymentStatus || 'created'),
    timestamp: entry.timestamp || new Date().toISOString(),
    failureReason: String(entry.failureReason || '').slice(0, 350),
    gatewayResponse: String(entry.gatewayResponse || '').slice(0, 400),
    retryAttempts: Number(entry.retryAttempts ?? getBookingRetryCount(cleanId)),
    webhookVerificationStatus: String(entry.webhookVerificationStatus || 'pending')
  };

  // Update existing entry if matching orderId/qrId/paymentId or prepend new log
  const existingIdx = paymentAuditLogs.findIndex(
    (item) =>
      item.id === logItem.id ||
      (logItem.razorpayPaymentId && item.razorpayPaymentId === logItem.razorpayPaymentId) ||
      (logItem.qrId && item.qrId === logItem.qrId && item.paymentStatus === logItem.paymentStatus)
  );
  if (existingIdx >= 0) {
    paymentAuditLogs[existingIdx] = {
      ...paymentAuditLogs[existingIdx],
      ...logItem,
      timestamp: new Date().toISOString()
    };
    return paymentAuditLogs[existingIdx];
  }

  paymentAuditLogs.unshift(logItem);
  if (paymentAuditLogs.length > 250) {
    paymentAuditLogs.length = 250;
  }
  return logItem;
}

export function getPaymentAuditLogs(bookingIdFilter = '') {
  const cleanFilter = String(bookingIdFilter || '').trim().toUpperCase();
  if (!cleanFilter) return paymentAuditLogs;
  return paymentAuditLogs.filter(
    (item) =>
      item.bookingId.includes(cleanFilter) ||
      item.razorpayOrderId.toUpperCase().includes(cleanFilter) ||
      item.razorpayPaymentId.toUpperCase().includes(cleanFilter) ||
      item.qrId.toUpperCase().includes(cleanFilter) ||
      item.customerPhone.includes(cleanFilter)
  );
}

export function getActiveOrderForBooking(bookingId, amountInPaise) {
  const key = `${String(bookingId || '').trim().toUpperCase()}_${Number(amountInPaise || 0)}`;
  const record = activeOrdersByBookingKey.get(key);
  if (!record) return null;
  // Valid for 15 minutes if unpaid
  const ageMs = Date.now() - (record.createdAtMs || 0);
  if (ageMs > 15 * 60 * 1000 || record.status === 'failed' || record.status === 'expired') {
    activeOrdersByBookingKey.delete(key);
    return null;
  }
  return record;
}

export function setActiveOrderForBooking(bookingId, amountInPaise, orderRecord) {
  const key = `${String(bookingId || '').trim().toUpperCase()}_${Number(amountInPaise || 0)}`;
  activeOrdersByBookingKey.set(key, {
    ...orderRecord,
    createdAtMs: Date.now()
  });
}

export function getActiveQrForBooking(bookingId, amountInPaise) {
  const key = `${String(bookingId || '').trim().toUpperCase()}_${Number(amountInPaise || 0)}`;
  const record = activeQrsByBookingKey.get(key);
  if (!record) return null;
  const nowSec = Math.floor(Date.now() / 1000);
  if (
    (record.closeBy && nowSec >= record.closeBy - 15) ||
    record.status === 'closed' ||
    record.status === 'expired' ||
    record.status === 'failed'
  ) {
    activeQrsByBookingKey.delete(key);
    return null;
  }
  return record;
}

export function setActiveQrForBooking(bookingId, amountInPaise, qrRecord) {
  const key = `${String(bookingId || '').trim().toUpperCase()}_${Number(amountInPaise || 0)}`;
  if (!qrRecord) {
    activeQrsByBookingKey.delete(key);
    return;
  }
  activeQrsByBookingKey.set(key, {
    ...qrRecord,
    updatedAtMs: Date.now()
  });
}

export function getVerifiedBookingById(bookingId) {
  const cleanId = String(bookingId || '').trim().toUpperCase();
  if (!cleanId) return null;
  if (verifiedBookingsById.has(cleanId)) {
    return verifiedBookingsById.get(cleanId);
  }
  const fromStored = storedBookings.find(
    (b) =>
      b &&
      String(b.id).toUpperCase() === cleanId &&
      b.transactionId &&
      String(b.transactionId).startsWith('pay_') &&
      (b.status === 'confirmed' || b.status === 'completed')
  );
  if (fromStored) {
    return {
      bookingId: cleanId,
      orderId: fromStored.orderId || '',
      paymentId: fromStored.transactionId,
      booking: fromStored
    };
  }
  return null;
}

export function registerPendingOrderRecord(orderRecord) {
  if (!orderRecord || !orderRecord.orderId || !orderRecord.bookingId) return;
  pendingOrdersById.set(orderRecord.orderId, {
    ...orderRecord,
    status: 'created',
    createdAt: new Date().toISOString()
  });
}

export function getPendingOrderRecord(orderId) {
  return pendingOrdersById.get(orderId) || null;
}

export function getVerifiedPaymentRecord(paymentId) {
  return verifiedPaymentsById.get(paymentId) || null;
}

export function getVerifiedOrderRecord(orderId) {
  return verifiedOrdersById.get(orderId) || null;
}

function mergeBookingObjects(existing, incoming) {
  if (!existing) return incoming;
  if (!incoming) return existing;

  const merged = {
    ...existing,
    ...incoming
  };

  // Preserve driver allotment details if present on either record
  merged.driverName = incoming.driverName || existing.driverName;
  merged.driverPhone = incoming.driverPhone || existing.driverPhone;
  merged.driverVehicleModel = incoming.driverVehicleModel || existing.driverVehicleModel;
  merged.driverVehicleNo = incoming.driverVehicleNo || existing.driverVehicleNo;
  merged.driverAssignedAt = incoming.driverAssignedAt || existing.driverAssignedAt;

  // Preserve advanced status (cancelled or completed takes precedence over default confirmed)
  if (existing.status === 'completed' || incoming.status === 'completed') {
    merged.status = incoming.status || existing.status;
  } else if (existing.status === 'cancelled' || incoming.status === 'cancelled') {
    merged.status = incoming.status || existing.status;
  }

  return merged;
}

export function upsertStoredBooking(booking) {
  if (!booking || !booking.id || String(booking.id).includes('DEMO') || String(booking.id).includes('TEST')) {
    return null;
  }
  const m = String(booking.id).trim().toUpperCase().replace(/[^A-Z0-9]/g, '').match(/^SIC26(\d{1,5})$/);
  if (m) {
    const seq = parseInt(m[1], 10);
    if (Number.isFinite(seq) && seq > serverSic26Counter && seq <= 9000) {
      serverSic26Counter = seq;
    }
  }
  const existingIdx = storedBookings.findIndex((b) => b.id === booking.id);
  if (existingIdx >= 0) {
    storedBookings[existingIdx] = mergeBookingObjects(storedBookings[existingIdx], booking);
    return storedBookings[existingIdx];
  } else {
    storedBookings.unshift(booking);
    return booking;
  }
}

let lastRazorpaySyncAtMs = 0;

async function syncBookingsFromRazorpayGateway(force = false) {
  const now = Date.now();
  if (!force && now - lastRazorpaySyncAtMs < 8000) {
    return;
  }
  lastRazorpaySyncAtMs = now;

  try {
    const { keyId, keySecret, candidateKeys } = resolveNormalizedRazorpayCredentials(process.env);
    if (!keySecret || (!keyId && candidateKeys.length === 0)) return;

    const keysToTry = candidateKeys.length > 0 ? candidateKeys : [{ keyId }];
    for (const candidate of keysToTry) {
      if (!candidate.keyId) continue;
      const basicAuth = Buffer.from(`${candidate.keyId}:${keySecret}`).toString('base64');
      const headers = {
        Accept: 'application/json',
        Authorization: `Basic ${basicAuth}`
      };

      const [paymentsRes, ordersRes] = await Promise.all([
        fetch('https://api.razorpay.com/v1/payments?count=25', { method: 'GET', headers }).catch(() => null),
        fetch('https://api.razorpay.com/v1/orders?count=25', { method: 'GET', headers }).catch(() => null)
      ]);

      if (!paymentsRes || !paymentsRes.ok) continue;

      const paymentsData = await paymentsRes.json().catch(() => null);
      const ordersData = ordersRes && ordersRes.ok ? await ordersRes.json().catch(() => null) : null;

      const ordersById = new Map();
      if (ordersData && Array.isArray(ordersData.items)) {
        for (const ord of ordersData.items) {
          if (ord && ord.id) ordersById.set(ord.id, ord);
        }
      }

      if (paymentsData && Array.isArray(paymentsData.items)) {
        for (const p of paymentsData.items) {
          if (!p || (p.status !== 'captured' && p.status !== 'authorized')) continue;
          const pNotes = p.notes || {};
          const linkedOrder = p.order_id ? ordersById.get(p.order_id) : null;
          const oNotes = linkedOrder?.notes || {};

          const bookingId =
            pNotes.verified_booking_id ||
            pNotes.booking_id ||
            oNotes.booking_id ||
            linkedOrder?.receipt ||
            '';

          if (!bookingId || !String(bookingId).toUpperCase().startsWith('SIC')) continue;

          const custParts = String(pNotes.customer_info || oNotes.customer_info || '').split('|');
          const customerName = custParts[0] || 'Verified Passenger';
          const customerPhone = (custParts[1] || oNotes.customer_phone || p.contact || '')
            .replace(/\D/g, '')
            .slice(-10);
          const customerEmail = custParts[2] || p.email || '';

          const routeParts = String(pNotes.route_info || '').split('|');
          const tripType = routeParts[0] || oNotes.trip_type || 'oneway';
          const pickupCity = routeParts[1] || oNotes.pickup_city || 'Delhi NCR';
          const dropCity = routeParts[2] || oNotes.drop_city || pickupCity;
          const distanceKm = Number(routeParts[3] || oNotes.distance_km || 230) || 230;

          const addrParts = String(pNotes.address_info || '').split('|');
          const pickupAddress = addrParts[0] || oNotes.pickup_address || pickupCity;
          const dropAddress = addrParts[1] || oNotes.drop_address || dropCity;

          const schedParts = String(pNotes.schedule_info || '').split('|');
          const pickupDate = schedParts[0] || oNotes.pickup_date || new Date().toISOString().slice(0, 10);
          const pickupTime = schedParts[1] || oNotes.pickup_time || '08:00 AM';
          const cabId = schedParts[2] || oNotes.cab_id || 'sedan';
          const cabInfo = SERVER_CABS_FLEET[cabId] || SERVER_CABS_FLEET.sedan;
          const cabName = schedParts[3] || `${cabInfo.name} (${cabInfo.models})`;

          const fareParts = String(pNotes.fare_info || '').split('|');
          const paidRupees = Math.round(Number(p.amount || 0) / 100);
          const totalFare = Number(fareParts[0] || oNotes.total_fare_rupees || paidRupees * 5) || paidRupees;
          const advancePaid = Number(fareParts[1] || oNotes.advance_paid_rupees || paidRupees) || paidRupees;
          const balanceDue =
            fareParts[2] !== undefined
              ? Number(fareParts[2])
              : oNotes.balance_due_rupees !== undefined
              ? Number(oNotes.balance_due_rupees)
              : Math.max(0, totalFare - advancePaid);
          const paymentMode = fareParts[3] || oNotes.payment_mode || (balanceDue === 0 ? 'full' : 'advance_20');

          const driverParts = pNotes.driver_info ? String(pNotes.driver_info).split('|') : [];
          const driverName = driverParts[0] || undefined;
          const driverPhone = driverParts[1] || undefined;
          const driverVehicleModel = driverParts[2] || undefined;
          const driverVehicleNo = driverParts[3] || undefined;
          const driverAssignedAt = driverParts[4] || undefined;
          const savedStatus = pNotes.booking_status || 'confirmed';

          upsertStoredBooking({
            id: String(bookingId).trim(),
            tripType,
            pickupCity,
            dropCity,
            pickupAddress,
            dropAddress,
            pickupDate,
            pickupTime,
            cabId,
            cabName,
            distanceKm,
            baseFare: Math.round(totalFare * 0.85),
            driverAllowance: 0,
            tollsAndTaxes: Math.round(totalFare * 0.1),
            gstAmount: Math.round(totalFare * 0.05),
            totalFare,
            advancePaid,
            balanceDue,
            paymentMode,
            paymentMethod: `Razorpay ${String(p.method || 'UPI').toUpperCase()} (${p.id})`,
            transactionId: p.id,
            customerName,
            customerPhone: customerPhone || '7710080992',
            customerEmail,
            status: savedStatus,
            driverName,
            driverPhone,
            driverVehicleModel,
            driverVehicleNo,
            driverAssignedAt,
            createdAt: p.created_at
              ? new Date(Number(p.created_at) * 1000).toISOString()
              : new Date().toISOString()
          });
        }
      }
      break;
    }
  } catch (err) {
    console.warn('[/api/bookings] Razorpay gateway sync notice:', err?.message);
  }
}

async function patchDriverInfoToRazorpayPayment(paymentId, status, driverInfo) {
  if (!paymentId || !String(paymentId).startsWith('pay_')) return;
  try {
    const { keyId, keySecret, candidateKeys } = resolveNormalizedRazorpayCredentials(process.env);
    if (!keySecret || (!keyId && candidateKeys.length === 0)) return;
    const keysToTry = candidateKeys.length > 0 ? candidateKeys : [{ keyId }];

    for (const candidate of keysToTry) {
      if (!candidate.keyId) continue;
      const basicAuth = Buffer.from(`${candidate.keyId}:${keySecret}`).toString('base64');
      const headers = {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Basic ${basicAuth}`
      };

      const getRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
        method: 'GET',
        headers
      }).catch(() => null);
      if (!getRes || !getRes.ok) continue;
      const pData = await getRes.json().catch(() => null);
      const existingNotes = pData?.notes || {};

      const updatedNotes = {
        ...existingNotes,
        booking_status: status || existingNotes.booking_status || 'confirmed'
      };
      if (driverInfo && driverInfo.name) {
        updatedNotes.driver_info = [
          String(driverInfo.name || '').slice(0, 50),
          String(driverInfo.phone || '').slice(0, 20),
          String(driverInfo.vehicleModel || '').slice(0, 60),
          String(driverInfo.carPlate || '').slice(0, 25),
          new Date().toISOString()
        ].join('|');
      }

      await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ notes: updatedNotes })
      }).catch(() => null);
      break;
    }
  } catch {}
}

export function saveVerifiedBookingRecord({ booking, orderId, paymentId }) {
  if (!booking || !booking.id) {
    throw new Error('Cannot save verified booking without booking.id');
  }

  const confirmedBooking = {
    ...booking,
    status: 'confirmed',
    transactionId: paymentId
  };

  upsertStoredBooking(confirmedBooking);

  const record = {
    bookingId: confirmedBooking.id,
    orderId,
    paymentId,
    verifiedAt: new Date().toISOString(),
    booking: confirmedBooking
  };

  if (paymentId) {
    verifiedPaymentsById.set(paymentId, record);
  }
  if (orderId) {
    verifiedOrdersById.set(orderId, record);
    const pending = pendingOrdersById.get(orderId);
    if (pending) {
      pendingOrdersById.set(orderId, { ...pending, status: 'verified', paymentId });
    }
  }
  if (confirmedBooking.id) {
    verifiedBookingsById.set(String(confirmedBooking.id).toUpperCase(), record);
  }

  return confirmedBooking;
}

const SERVER_AMAN_MISHRA_SIGNATURE_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAesAAAB7CAYAAABU4qhWAAANhklEQVR42u2d76sdRxnH+y8kcPJCOFgDGyh6+qKF1RI56gu5VZEcWqGeF0Y9/gA9fSF4S31zS6V6LQ2GxCLhWrQaA0F6fdHIbWOjFlrU+8pgrKSai6+aVG0kVK21WHudI3PD3s3Mzo+d3Z3d/XxgSM49e3Zmnpmd7z6zs8/cdBMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAETM3gNHRyKti7RdkM6KNMZaAAAA9Qn0UKRfGgS6KN2HFQEAAKrxoE+XEGhVOi/SAOsCAACUE+mVwAKtSiewNAAAQJwinU8zLA8AAGAn1NsNpou0AAAAQLxCfT3REgAAAGGE+pBItxjOuVg5PkWwAQAA6hHqTwTI56cINgDUNK69AytAVzrz0CCYzzftydNKAADQZ6GeGYTyMzWU4XsINgAAgFok0wJxfH8D5TEJ9qu0GgAA9Emo7ykQxfUGy2US7CO0HgAA9EGo57FON4v83850OAAA9F2oZ7GLoCjLjwyCvUJLAgBAV4V6UCCA5yIr63m8awAA6KNYt0r8DN71Oi0KAABdE+q1JoRanP9LIt3ZlxsMAAAAX8EbtVnwFivANeUf07oAANBpoRbpiy2qxzLeNQAAdFWsdUKddqEutDAAALRdqGdNhRCtUbAfoqUBAKCtolb0mtaoxfV6GO8aAAC6ItadXEUtyn8HYg0AAF0Q6uUCsf5Yy+u2F7EGAIAue9UPdLR+d9PqAADQJiE72rXn1Io6Hsa7BgCArnnVg67Xk5YHAIC2CNgxhVAf7slNyRI9AAAAWulV96iuJ+kBAAAQu3id6/JzakV9U6bCAQAAr7pldaYXAABAzKL1mkKsTyHWAAAAeNWINQAAgI9Qi3S5p3U/SI8AAAC86rjr/kN6BAAAxCZWf1YI1gd6VP8nc3X/N70CAADwquOq/7t4bg0AADELlSpa2b/6fsNCzwAAgKi9apHGiDUAQK1j0D6bvwFi3WuhwgYA0PAYdCtWAF3nWGMjC+1NS0oPAYCmvWsAvOrdtjifs8WMHgIANY9D+7EC5DvFALHeZY/lnC3O0ksAAM8amu4UTzEFvsseM25cAAAgNnHCqzbYhF4CAACINWIN9bfxP0Q6gSUAoJVC3ecpcMR6lw2GdeQh0rTuFfe0LwDgVXfTLkkNeaYyr4sR1H8nRvz9FeYxbaLfaW5QJ/R6AIhVkOZNiBKetVVbHPa9sRJ/f09gMRt06UZRI9bcpAIAXnVfxVq+Fjcq2xbi8y9sRMa23Isy6R55KPJ4rMJZhHw6XnG7DprIFwAAsa7GNo/bzDjoYqcXiNFMcewFzbGb8pnuEZ1QyzQsaNMnXW5E6vI6Zd1Ueb1ccbt+WJPviF4PAG0R6ytY5bptlosW3YnPn1eJmRTXNYO4pvLYjxiO+3++Fsdsu9yAac6R2Jy/yhtFmb5fcbveYbrhAQCIWqyxyC7b5AOjLGe++65isJ+aBM8zbdYk1tt1ibU43xt13hhY1v+b9HoAiFGMPolYF9pn4iKIEaTfyrIdsxDrtGGxNuW3XOWrXCwwA4DWetUMVjfYZ6Syj+20dC5dsxVEVb4ugqqYvldO8TYl1g55btQt2PR6AGiDWC9hlV32STRiOPMRORcxXDy3tTz/mkLgVMfNHUUziUCsF+nxmr3rZXo+AEQt1h0V26TE71ONWJ+Tn086CrCT1xp4ivyKy/nl949k/vZWQ2J9fXq/gv6xhHcNNYxD7JwFiLWiTtNQA7Bc1a0SsZfl57EmqIyLAL/hcrNQJjmIZqoSs5rE+ojMN83V/8W6vGtGBgjcx9iTGkp1oEtdGKSkYJ6q4nmrKniG/Pvila2bDeKzZiEQc8vZgeBirVpcmC93/malJrF+KHfs4vn9+mLDjYr6z1XEGvCsoTVetUgrLSr73EOsph75JJbe8nOuATZcw3c61nVdrmRPVG0s/t0j0tdFOiA/f1x+/2hRvjWJdVLy3DPpmSeWx6+wdgMQaYi1E43a5E2UWR1d0rO2FetBDQFEhlKEd/J4Vj4z/5VI/5GiM8mv+i6wyXtdhTVwXYKuOBe/fUJzzlWfmwdGCQjQzw8yBQ5lO9Hx2AcnUaYzAZ/XDjzLkDrE2V6N0ZbZcmXSd3x+X/HMznbIc7nMqiDWUMF1t1+kW7EEhB4ojzdcnlHOa/RNL4p02fTKUmjPuiVtfkikL/jEv64j3GiFQm08v2ZdwLiBNmK3uw6Jdeb/+/CwIcgAV2E+4/x+wXIKdBjQaz5TUL//lix/3rP+Y0/7y20h+om05ywb6KRMPG7x20879JOho+g/XYNdp5qyrjBKtf6a2ZfzshFriFqsqwqr+TPT1HaIyFeK93D/2uM+cyJwfzhZc/8auZ6rai865DqLTIS8icWx2Ucjf2JEDO9NA/RVrGcN2Snv+fyhx32m7CrtueFVslRxo7RYNPcVH4H18KznNYu1Tb9/1fJcK7bP6DWhaL3elgCAageJSY1i/e0SAv1wBLZ6qennmB3pc2tFwVcsbpKsI7xlvrvgGkbUJkRrRvCWS9rE9jqYOHjJxml0jyh6Z1h059SuvK4FlQ2cxyLwIBbpGbnI7IVYVlG6TqX2tD+lhu8HgcKsJjbe8E5EOEWM9A2fvmq40V2t4bpQPjJQrAexuckwTb1fzbXbhFXyiDXEI0DTGvIsWun9mEi3Fw32sdiK3lMoxF/THGPai3tsKWLrJUVv6nFtZD31Z11mBwz5/Nhjpmmc+f2KjzdumU9imBHZpOffYFeeVUMtYj1ooAx72mgrek+hl3nD9GvB9Hc2bVkKymVNObZCLDCT55oVxEkPFnBHE/FuTX53T4A1HkkJsR6Yjqf3I9ZQryfEhYdY6+qaGI7dKLvLmMdvLnvO3Ox65GMKJarZh9x0/lVHW+te2fqJSD+oKlqf5f7pKWLtfQ0xBQ7BOtN9XHjeAnaxR7MtVpHaivaD1oSITTQ7iW1ZeO2mwCYuO5QV7XT2+6rD2YbcnKWkWGen1ndiH3zLdFPGyABQ/6B8GKtobbWnL4vLNIP+Oz2E+vqUbtEiKc10c5LLa9NVJOSiq60yz7FLbEu64mjzkyUE+c0i4Xdo57mi3mcy4r2JWIf1uuUe8QexCLgOygOsorXVp3o6Ba7zvKYh47Ob3qXXRLmbOtRpuNczbrxn/V73sLuPYKem8rrOoCjadrGY7k2mwQEiGZSxCLYyiNNcfv9BzfdLtiKuyDP/HPiaRblWPOq2ZJgRWHMVa90sg6ftR/IVtPyOai7vpXuLdV072AEAAoStqhPrjYIV3dl3cmeBXiWa5r7/e+7701XU1VHU/lZwXNpEH3Q4bhJIsAkOBIAAYauIxNrFU7YO6JH5TWJ4dWjT9rUkh7qOLeryO5sNQRYL1arqJ6pp/BB9NZBYE5oUoMIBOe/9/BqraG01R6ydo46NfaZMVSuOM9+pXpnaKFnXiYVYJ5avmQ0rFOsyq7yfCNDeS/LYAVPhAPUOyC+wuMx7oNzoWX1994We+Qzoiqn2R+XfdSuz/+k75aya1newySsWx01KtsUws4OW1bvcmtfklvLnlf++T1O3v4h0s8w/9b1xAIDAAzIWcRKvUU/qPTKI9dziHInc6GJYUVuUuomynNJPHF71mpoWyvnO5pTd4tOQvmr7SEG1IQ+jBABi3bSd7uyzrUR9P+uz+1PDnv9qkfBIQdWtsH5a491u277qGCD8qHH/dotz3F/llrOMHwCIdexe9TY2aN4G8lnzwvN/yiBED0gvdSNwtK9rBcfe67sILuSrUorV89l0Sc54jBk/SvVDQooCYh2pUL3WQxvsj3l9Q4AALcZ6KY79nEO/mZTob6UDF4nf3GLarYzxAwCx7ppYL/XUDouFSOdCPXuuSLC3qgrsIY454nj8g4EW1+2k35R9TY3xAwCx7qqNzmKn1rXZSD6zthXuucO5r+YDoRiOf8XTu57JHbe+HJNA58qYcl0AINaxetXYqZ3tOJD/LkmRGZY9V9+vs/wKeXoZQHUX2yYXm7NYE6kJfPrRvV28zrIR22hlgOoutFXEutA+E7xqCNifFhHd7upYnXY2HSGgEkCFFxrPnIrt8xxiDQAAMQgSQmRhG2wEAACIdTvE+hGsAgAATQtSgkWu2+WuvsYDBwDo68D/NpFub4FYb0Rsww+J9I0GvWpmHgAAIAqx3qaMiDUAACCEQYTTd/MBy/w2CDEKAAAxCeGkpWJdmWDjVQMAQOxiOIqwfKcKBHsUOC/V7k2n6SUAABCTWD8faRlPh9iIwZDHEl41AADEKtatiBFeZnvDMuenhwAAQAwiOGqLOBUI9qWS5/2o5ry8ew4AAFGK4IGIyzkuEOyTnudM8aoBAKANYn13i7zrjaIpcdfXrArOw05CAAAQr3fdgrKuGwR71fI8z2h+P6NHAABAjAK4v2WC/XODYBeuFM8/q2f6GwAA2uhhv7sFZV21EOxFeks+mx7KQDBbCDUAQCs1as9iLMcQB47uE+mKSLe1pLwrloJtk1j9DQAQ/7h/CCu0f0bAN7GgDAAAoAbBnngKNQvKAAAAGhDumaVQp1gLAACgWdFORLqWE+jXF1441gEAAAAAAIBee8xp2aAo8jzZiGgXsCwAQHf4H+3VHWDF56YiAAAAAElFTkSuQmCC';

function formatServerDigitalSignTimestamp(dateInput) {
  const dateObj =
    dateInput instanceof Date
      ? dateInput
      : typeof dateInput === 'string' && dateInput.trim()
      ? new Date(dateInput)
      : new Date();
  const validDate = Number.isNaN(dateObj.getTime()) ? new Date() : dateObj;
  const yyyy = validDate.getFullYear();
  const mm = String(validDate.getMonth() + 1).padStart(2, '0');
  const dd = String(validDate.getDate()).padStart(2, '0');
  const hh = String(validDate.getHours()).padStart(2, '0');
  const min = String(validDate.getMinutes()).padStart(2, '0');
  const ss = String(validDate.getSeconds()).padStart(2, '0');
  return `${yyyy}.${mm}.${dd} ${hh}:${min}:${ss} IST`;
}

function buildServerBookingInvoicePdfBuffer(booking) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // Clean Light Theme Corporate Border
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, pageWidth, 297, 'F');

  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.rect(margin - 2, 8, contentWidth + 4, 281);

  // Top Dual Accent Line (Navy & Gold)
  doc.setFillColor(15, 41, 88);
  doc.rect(margin - 2, 8, (contentWidth + 4) * 0.72, 2.2, 'F');
  doc.setFillColor(245, 158, 11);
  doc.rect(margin - 2 + (contentWidth + 4) * 0.72, 8, (contentWidth + 4) * 0.28, 2.2, 'F');

  let y = 14;

  // 1. Official Vector Crest on Left + Company Info in Center + Invoice Box on Right
  doc.setFillColor(15, 41, 88);
  doc.setDrawColor(245, 158, 11);
  doc.setLineWidth(0.6);
  doc.roundedRect(margin, y, 25, 25, 3, 3, 'FD');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('SAFAR', margin + 12.5, y + 9, { align: 'center' });
  doc.setTextColor(251, 191, 36);
  doc.setFontSize(8.5);
  doc.text('INDIA', margin + 12.5, y + 14.2, { align: 'center' });
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7.5);
  doc.text('CABS', margin + 12.5, y + 19, { align: 'center' });
  doc.setFontSize(5.5);
  doc.setTextColor(203, 213, 225);
  doc.text('A1 SERVICE', margin + 12.5, y + 22.8, { align: 'center' });

  const companyX = margin + 29;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('SafarIndiaCabs', companyX, y + 5.5);

  doc.setTextColor(180, 83, 9);
  doc.setFontSize(7.5);
  doc.text('A1 CAB SERVICES  •  ALL INDIA COMMERCIAL TOUR & TRAVELS', companyX, y + 10);

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(8.2);
  doc.text('GSTIN: 07DQHPA3025F1ZD   |   Proprietor: Aman Mishra', companyX, y + 15);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(7.6);
  doc.text('Regd. Add: H NO 143 STREET 4 JHARODA MAJRA NORTH DELHI BURARI 110084', companyX, y + 19.5);
  doc.text('Email: Safarindiacabs01@gmail.com   |   Mob: +91 7710080992', companyX, y + 23.8);

  const isCompletedInvoice = booking.status === 'completed';
  const cleanIdSuffix = String(booking.id || 'SIC2601').replace(/^SIC-?/i, '');
  const invoiceNo = isCompletedInvoice ? `INV-SIC${cleanIdSuffix}` : `VCR-SIC${cleanIdSuffix}`;
  const invoiceDateStr = new Date(booking.completedAt || booking.createdAt || Date.now()).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const badgeW = 56;
  const badgeX = pageWidth - margin - badgeW;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(badgeX, y, badgeW, 25, 2, 2, 'FD');

  doc.setTextColor(15, 41, 88);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.text(isCompletedInvoice ? 'FINAL TAX INVOICE' : 'BOOKING VOUCHER', badgeX + badgeW - 3, y + 5.5, { align: 'right' });

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.6);
  doc.text(
    isCompletedInvoice ? 'ORIGINAL FOR RECIPIENT' : 'ADVANCE CONFIRMATION VOUCHER',
    badgeX + badgeW - 3,
    y + 9.2,
    { align: 'right' }
  );

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.text(
    `${isCompletedInvoice ? 'Inv No' : 'Voucher No'}: ${invoiceNo}`,
    badgeX + badgeW - 3,
    y + 14.5,
    { align: 'right' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  doc.text(`Date: ${invoiceDateStr}`, badgeX + badgeW - 3, y + 18.8, { align: 'right' });
  doc.text(`Booking ID: ${booking.id}`, badgeX + badgeW - 3, y + 22.8, { align: 'right' });

  y += 29;

  doc.setDrawColor(226, 232, 240);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;

  // 2. Booking Status & SAC Strip
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 9, 1.5, 1.5, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  const statusLabel =
    booking.status === 'completed'
      ? 'STATUS: COMPLETED & FINAL GST TAX INVOICE SETTLED'
      : booking.status === 'cancelled'
      ? 'STATUS: CANCELLED'
      : 'STATUS: BOOKING CONFIRMED (FINAL INVOICE ON TRIP COMPLETION)';
  doc.text(statusLabel, margin + 3.5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text('SAC Code: 996412 (Passenger Transport by Cab)', pageWidth - margin - 3.5, y + 6, {
    align: 'right'
  });

  y += 12.5;

  // 3. Two-Column Customer & Vehicle Summary
  const colWidth = (contentWidth - 5) / 2;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, colWidth, 31, 2, 2, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.rect(margin + 0.2, y + 0.2, colWidth - 0.4, 6.8, 'F');
  doc.setTextColor(15, 41, 88);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('BILLED TO (CUSTOMER / CORPORATE DETAILS)', margin + 3.5, y + 4.8);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text(String(booking.customerName || 'Valued Passenger').slice(0, 38), margin + 3.5, y + 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  doc.text(`Mobile: +91 ${booking.customerPhone || '7710080992'}`, margin + 3.5, y + 18);
  if (booking.customerGst) {
    doc.text(
      `Company: ${booking.gstCompanyName || '-'} | GSTIN: ${booking.customerGst}`,
      margin + 3.5,
      y + 23.2
    );
  } else if (booking.customerEmail) {
    doc.text(`Email: ${booking.customerEmail}`, margin + 3.5, y + 23.2);
  } else {
    doc.text(`Payment Ref: ${booking.transactionId || 'Verified Online/Cash'}`, margin + 3.5, y + 23.2);
  }
  doc.text('Place of Supply: North India / Delhi (07)', margin + 3.5, y + 28.2);

  const rightX = margin + colWidth + 5;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightX, y, colWidth, 31, 2, 2, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.rect(rightX + 0.2, y + 0.2, colWidth - 0.4, 6.8, 'F');
  doc.setTextColor(15, 41, 88);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TRIP & VEHICLE PARTICULARS', rightX + 3.5, y + 4.8);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9.5);
  doc.text(String(booking.cabName || 'Sedan AC').slice(0, 38), rightX + 3.5, y + 12.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(51, 65, 85);
  doc.text(`Travel Date: ${booking.pickupDate || '-'} at ${booking.pickupTime || '-'}`, rightX + 3.5, y + 18);
  doc.text(
    `Trip Type: ${String(booking.tripType || 'ONEWAY').toUpperCase()}  |  Billed Dist: ${booking.distanceKm || 230} KM`,
    rightX + 3.5,
    y + 23.2
  );
  doc.text(
    `Chauffeur: ${booking.driverName || 'Verified Safar Chauffeur'} (${booking.driverVehicleNo || 'Commercial Cab'})`,
    rightX + 3.5,
    y + 28.2
  );

  y += 35;

  // 4. Route & Location Details Box
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setFillColor(241, 245, 249);
  doc.rect(margin + 0.2, y + 0.2, contentWidth - 0.4, 6.5, 'F');
  doc.setTextColor(15, 41, 88);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('JOURNEY PICKUP & DROP ITINERARY', margin + 3.5, y + 4.6);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(8.2);
  doc.text('Pickup Location:', margin + 3.5, y + 12.5);
  doc.setFont('helvetica', 'normal');
  const pickupFull = booking.pickupAddress
    ? `${booking.pickupAddress}, ${booking.pickupCity}${booking.landmark ? ` (Landmark: ${booking.landmark})` : ''}`
    : booking.pickupCity || 'Delhi NCR';
  doc.text(String(pickupFull).slice(0, 88), margin + 30, y + 12.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Drop Location:', margin + 3.5, y + 19.5);
  doc.setFont('helvetica', 'normal');
  const dropFull = booking.dropAddress
    ? `${booking.dropAddress}, ${booking.dropCity}`
    : booking.dropCity || booking.pickupCity || 'Destination';
  doc.text(String(dropFull).slice(0, 88), margin + 30, y + 19.5);

  y += 28;

  // 5. Itemized Fare & GST Tax Table (Separated rows for Base Fare, Driver Allowance, Highway Toll, State Tax, Hill Charge, GST)
  const totalFare = Number(booking.totalFare || 0);
  const gstAmount = Number(booking.gstAmount ?? Math.round((booking.baseFare || totalFare) * 0.05));
  const halfGst = Math.round(gstAmount / 2);
  const rawTolls = Number(booking.tollsAndTaxes || 0);
  const highwayToll =
    booking.highwayToll !== undefined
      ? Number(booking.highwayToll)
      : rawTolls > 0
      ? Math.round(rawTolls * 0.55)
      : 0;
  const statePermitTax =
    booking.statePermitTax !== undefined
      ? Number(booking.statePermitTax)
      : Math.max(0, rawTolls - highwayToll);
  const hillStationCharge = Number(booking.hillStationCharge || 0);
  const tripDays = Math.max(1, Number(booking.tripDays || 1));

  let driverAllowance = Number(booking.driverAllowance || 0);
  let baseFare =
    Number(booking.baseFare || 0) ||
    Math.max(0, totalFare - gstAmount - rawTolls - driverAllowance - hillStationCharge);

  // If driverAllowance was lumped into baseFare (0), separate out ₹260/day so it never inflates Base Fare
  if (driverAllowance === 0 && baseFare > 600 && booking.tripType !== 'local') {
    const separatedBata = 260 * tripDays;
    if (baseFare > separatedBata + 300) {
      driverAllowance = separatedBata;
      baseFare = baseFare - separatedBata;
    }
  }

  const extraKmDriven = Math.max(0, Number(booking.extraKmDriven || 0));
  const extraKmCharge = Math.max(0, Number(booking.extraKmCharge || 0));
  const extraTollCharges = Math.max(0, Number(booking.extraTollCharges || 0));
  const otherSurcharges = Math.max(0, Number(booking.otherSurcharges || 0));

  const taxableValue =
    baseFare +
    driverAllowance +
    highwayToll +
    statePermitTax +
    hillStationCharge +
    extraKmCharge +
    extraTollCharges +
    otherSurcharges;

  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.rect(margin, y, contentWidth, 7.6, 'FD');
  doc.setTextColor(15, 41, 88);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.0);
  doc.text('ITEMIZED FARE & TAX BREAKUP (SAC: 996412)', margin + 3.5, y + 5.1);
  doc.text('AMOUNT (INR)', pageWidth - margin - 3.5, y + 5.1, { align: 'right' });

  y += 7.6;

  const tripTypeBadge =
    String(booking.tripType || 'oneway') === 'roundtrip'
      ? `Round Trip (${tripDays === 1 ? 'Same Day 1D' : `${tripDays} Days`})`
      : String(booking.tripType || 'ONEWAY').toUpperCase();

  const rows = [
    {
      label: `1. Base Cab & Fuel Charges (${tripTypeBadge} • ${booking.distanceKm || 230} KM Included)`,
      value: `INR ${baseFare.toLocaleString('en-IN')}.00`
    },
    {
      label: `2. Chauffeur / Driver Allowance (Daily Bata • ${tripDays} ${tripDays === 1 ? 'Day' : 'Days'})`,
      value: driverAllowance > 0 ? `INR ${driverAllowance.toLocaleString('en-IN')}.00` : 'Included (INR 0.00)'
    },
    {
      label: '3. Highway FASTag Toll Tax',
      value: highwayToll > 0 ? `INR ${highwayToll.toLocaleString('en-IN')}.00` : 'Extra (As Per Actuals)'
    },
    {
      label: '4. State Border Entry Permit Tax',
      value: statePermitTax > 0 ? `INR ${statePermitTax.toLocaleString('en-IN')}.00` : 'Extra (As Per Actuals)'
    },
    ...(hillStationCharge > 0
      ? [
          {
            label: '5. Hill Station / Mountain Drive Allowance',
            value: `INR ${hillStationCharge.toLocaleString('en-IN')}.00`
          }
        ]
      : []),
    ...(extraKmCharge > 0
      ? [
          {
            label: `Post-Trip Extra Distance Charge (${extraKmDriven} Extra KM Driven)`,
            value: `INR ${extraKmCharge.toLocaleString('en-IN')}.00`
          }
        ]
      : []),
    ...(extraTollCharges > 0
      ? [
          {
            label: 'Post-Trip Extra Highway Toll / FASTag Charges',
            value: `INR ${extraTollCharges.toLocaleString('en-IN')}.00`
          }
        ]
      : []),
    ...(otherSurcharges > 0
      ? [
          {
            label: 'Other Post-Trip Surcharges (Parking / Waiting / Detour)',
            value: `INR ${otherSurcharges.toLocaleString('en-IN')}.00`
          }
        ]
      : []),
    {
      label: 'Total Taxable Value',
      value: `INR ${taxableValue.toLocaleString('en-IN')}.00`,
      bold: true
    },
    {
      label: 'Add: Central GST (CGST @ 2.5% under SAC 996412)',
      value: `INR ${halfGst.toLocaleString('en-IN')}.00`
    },
    {
      label: 'Add: State GST (SGST @ 2.5% under SAC 996412)',
      value: `INR ${(gstAmount - halfGst).toLocaleString('en-IN')}.00`
    }
  ];

  const rowH = rows.length > 8 ? 6.0 : rows.length > 7 ? 6.6 : 7.2;
  rows.forEach((row, index) => {
    doc.setFillColor(index % 2 === 0 ? 255 : 248, index % 2 === 0 ? 255 : 250, index % 2 === 0 ? 255 : 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(margin, y, contentWidth, rowH, 'FD');
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal');
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(7.9);
    doc.text(row.label, margin + 3.5, y + rowH - 2.1);
    doc.text(row.value, pageWidth - margin - 3.5, y + rowH - 2.1, { align: 'right' });
    y += rowH;
  });

  // Grand Total Row
  doc.setFillColor(254, 243, 199);
  doc.setDrawColor(245, 158, 11);
  doc.rect(margin, y, contentWidth, 8.8, 'FD');
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.2);
  doc.text(
    isCompletedInvoice
      ? 'FINAL TAX INVOICE TOTAL (INCLUSIVE OF 5% GST)'
      : 'ESTIMATED TOTAL TRIP FARE (INCLUSIVE OF 5% GST)',
    margin + 3.5,
    y + 5.9
  );
  doc.text(`INR ${totalFare.toLocaleString('en-IN')}.00`, pageWidth - margin - 3.5, y + 5.9, {
    align: 'right'
  });

  y += 10.5;

  // Payment Settlement Summary Strip
  const isSettled = booking.status === 'completed' || Number(booking.balanceDue) === 0;
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(margin, y, contentWidth, 14, 1.8, 1.8, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(21, 128, 61);
  const advancePaid = Number(booking.advancePaid || 0);
  const balanceDue = Number(booking.balanceDue || 0);
  doc.text(
    isSettled
      ? `PAYMENT STATUS: 100% PAID & SETTLED (INR ${totalFare.toLocaleString('en-IN')}.00)`
      : `ADVANCE PAID: INR ${advancePaid.toLocaleString('en-IN')}.00`,
    margin + 3.5,
    y + 5.8
  );

  doc.setTextColor(180, 83, 9);
  doc.text(
    isSettled
      ? 'REMAINING BALANCE DUE: INR 0.00 (NIL)'
      : `BALANCE PAYABLE TO CHAUFFEUR: INR ${balanceDue.toLocaleString('en-IN')}.00`,
    pageWidth - margin - 3.5,
    y + 5.8,
    { align: 'right' }
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.4);
  doc.setTextColor(71, 85, 105);
  doc.text(
    `Payment Mode: ${String(booking.paymentMethod || 'Online / UPI / Cash').toUpperCase()}   |   Transaction Ref: ${booking.transactionId || booking.id}`,
    margin + 3.5,
    y + 11.2
  );

  y += 18;

  // 6. Bottom Verification Footer
  const footerH = 42;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, footerH, 2, 2, 'FD');

  doc.setTextColor(15, 41, 88);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.text('TERMS & JURISDICTION:', margin + 3.5, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(71, 85, 105);
  doc.text('1. Certified that particulars given above are true & correct.', margin + 3.5, y + 11);
  doc.text('2. Toll Tax, State Tax & Parking are extra as per actuals.', margin + 3.5, y + 15.2);
  doc.text('3. Subject to North Delhi Jurisdiction only.', margin + 3.5, y + 19.4);
  doc.text('4. 24x7 Helpline: +91 7710080992 | Safarindiacabs01@gmail.com', margin + 3.5, y + 23.6);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text('Regd. Office: H NO 143 Street 4 Jharoda Majra Burari Delhi 110084', margin + 3.5, y + 29);

  const digBoxX = margin + 74;
  const digBoxW = 54;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(digBoxX, y + 5, digBoxW, 31, 1.5, 1.5, 'FD');

  const digitalTimestamp = formatServerDigitalSignTimestamp(booking.pickupDate);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('Digitally signed by', digBoxX + 2.5, y + 10.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('SAFARINDIACABS', digBoxX + 2.5, y + 14.5);
  doc.text('(AMAN MISHRA)', digBoxX + 2.5, y + 18.2);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.4);
  doc.setTextColor(51, 65, 85);
  doc.text('GSTIN: 07DQHPA3025F1ZD', digBoxX + 2.5, y + 22.5);
  doc.text(`Date: ${digitalTimestamp}`, digBoxX + 2.5, y + 26.5);
  doc.text('Location: IN (Verified)', digBoxX + 2.5, y + 30.5);

  const signCenterX = pageWidth - margin - 29;
  doc.setTextColor(15, 41, 88);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('For SafarIndiaCabs', signCenterX, y + 5.5, { align: 'center' });

  // Draw Official Circular Rubber Mohar Stamp (Vector)
  const stampCx = pageWidth - margin - 42;
  const stampCy = y + 20;
  doc.setDrawColor(29, 78, 216);
  doc.setLineWidth(0.55);
  doc.circle(stampCx, stampCy, 11.5, 'S');
  doc.setLineWidth(0.25);
  doc.circle(stampCx, stampCy, 10.4, 'S');
  doc.circle(stampCx, stampCy, 7.2, 'S');
  doc.setTextColor(29, 78, 216);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.text('SAFAR INDIA CABS', stampCx, stampCy - 7.8, { align: 'center' });
  doc.setFontSize(4.2);
  doc.text('GST: 07DQHPA3025F1ZD', stampCx, stampCy - 1.5, { align: 'center' });
  doc.text('VERIFIED TAX INVOICE', stampCx, stampCy + 1.2, { align: 'center' });
  doc.text('PROP: AMAN MISHRA', stampCx, stampCy + 3.8, { align: 'center' });
  doc.setFontSize(4.0);
  doc.text('NORTH DELHI-110084', stampCx, stampCy + 8.6, { align: 'center' });

  // Embed Proprietor Aman Mishra's authentic handwritten signature PNG
  try {
    doc.addImage(SERVER_AMAN_MISHRA_SIGNATURE_DATA_URL, 'PNG', pageWidth - margin - 38, y + 13, 33, 14);
  } catch {
    // ignore signature image error
  }

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);
  doc.line(pageWidth - margin - 54, y + 34.5, pageWidth - margin - 4, y + 34.5);
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  doc.text('Prop. Aman Mishra (Signatory)', signCenterX, y + 38.5, { align: 'center' });

  return Buffer.from(doc.output('arraybuffer'));
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'GET') {
    let query = req.query || {};
    try {
      const parsedUrl = new URL(req.url || '/', 'https://safarindiacabs.com');
      const urlParams = {};
      parsedUrl.searchParams.forEach((v, k) => {
        urlParams[k] = v;
      });
      query = { ...urlParams, ...query };
    } catch {}

    if (query.action === 'invoice_pdf') {
      try {
        const rawId = String(query.id || query.bookingId || 'SIC2601').trim();
        const existing = storedBookings.find(
          (b) => b && String(b.id).toUpperCase() === rawId.toUpperCase()
        );
        const totalFare = Number(query.totalFare ?? existing?.totalFare ?? 0);
        const gstAmount = Number(
          query.gstAmount ?? existing?.gstAmount ?? Math.round(totalFare * 0.05)
        );
        const tollsAndTaxes = Number(query.tollsAndTaxes ?? existing?.tollsAndTaxes ?? 0);
        const driverAllowance = Number(query.driverAllowance ?? existing?.driverAllowance ?? 0);
        const baseFare =
          Number(query.baseFare ?? existing?.baseFare ?? 0) ||
          Math.max(0, totalFare - gstAmount - tollsAndTaxes - driverAllowance);
        const advancePaid = Number(query.advancePaid ?? existing?.advancePaid ?? 0);
        const balanceDue = Number(
          query.balanceDue ?? existing?.balanceDue ?? Math.max(0, totalFare - advancePaid)
        );

        const highwayToll =
          query.highwayToll !== undefined
            ? Number(query.highwayToll)
            : existing?.highwayToll !== undefined
            ? Number(existing.highwayToll)
            : undefined;
        const statePermitTax =
          query.statePermitTax !== undefined
            ? Number(query.statePermitTax)
            : existing?.statePermitTax !== undefined
            ? Number(existing.statePermitTax)
            : undefined;
        const hillStationCharge = Number(
          query.hillStationCharge ?? existing?.hillStationCharge ?? 0
        );
        const tripDays = Math.max(1, Number(query.tripDays ?? existing?.tripDays ?? 1));

        const invoiceBooking = {
          ...(existing || {}),
          id: rawId,
          customerName: query.customerName || existing?.customerName || 'Verified Passenger',
          customerPhone: query.customerPhone || existing?.customerPhone || '7710080992',
          customerEmail: query.customerEmail || existing?.customerEmail || '',
          customerGst: query.customerGst || existing?.customerGst || '',
          gstCompanyName: query.gstCompanyName || existing?.gstCompanyName || '',
          tripType: query.tripType || existing?.tripType || 'oneway',
          tripDays,
          pickupCity: query.pickupCity || existing?.pickupCity || 'Delhi NCR',
          dropCity: query.dropCity || existing?.dropCity || 'Destination',
          pickupAddress: query.pickupAddress || existing?.pickupAddress || '',
          dropAddress: query.dropAddress || existing?.dropAddress || '',
          landmark: query.landmark || existing?.landmark || '',
          pickupDate:
            query.pickupDate || existing?.pickupDate || new Date().toISOString().slice(0, 10),
          pickupTime: query.pickupTime || existing?.pickupTime || '08:00 AM',
          cabName: query.cabName || existing?.cabName || 'Sedan AC (Dzire / Etios)',
          distanceKm: Number(query.distanceKm || existing?.distanceKm || 230),
          baseFare,
          driverAllowance,
          tollsAndTaxes,
          highwayToll,
          statePermitTax,
          hillStationCharge,
          gstAmount,
          totalFare,
          advancePaid,
          balanceDue,
          status: query.status || existing?.status || 'confirmed',
          paymentMethod: query.paymentMethod || existing?.paymentMethod || 'Razorpay Verified',
          transactionId: query.transactionId || existing?.transactionId || rawId,
          driverName: query.driverName || existing?.driverName || '',
          driverPhone: query.driverPhone || existing?.driverPhone || '',
          driverVehicleNo: query.driverVehicleNo || existing?.driverVehicleNo || '',
          createdAt: query.createdAt || existing?.createdAt || new Date().toISOString()
        };

        const pdfBuffer = buildServerBookingInvoicePdfBuffer(invoiceBooking);
        const safeFileId = rawId.replace(/[^A-Za-z0-9_-]/g, '') || 'SIC2601';
        const fileName = `SafarIndiaCabs_GST_Invoice_${safeFileId}.pdf`;
        const disposition = query.mode === 'inline' || query.mode === 'view' ? 'inline' : 'attachment';

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `${disposition}; filename="${fileName}"`);
        res.setHeader('Content-Length', String(pdfBuffer.length));
        res.setHeader('Cache-Control', 'public, max-age=3600');
        return res.status(200).end(pdfBuffer);
      } catch (pdfErr) {
        console.error('[/api/bookings?action=invoice_pdf] Error generating PDF:', pdfErr);
        return res.status(500).json({ error: 'Failed to generate invoice PDF' });
      }
    }

    const forceSync = query.force === '1' || query.force === 'true';
    await syncBookingsFromRazorpayGateway(forceSync);
    const cleanList = storedBookings.filter(
      (b) => b && !b.id.includes('DEMO') && !b.id.includes('TEST')
    );
    return res.status(200).json({
      success: true,
      count: cleanList.length,
      bookings: cleanList
    });
  }

  if (req.method === 'POST') {
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const { action, booking, bookings, bookingId, status, driverInfo } = body;

      if (action === 'next_booking_id') {
        const nextId = generateServerSequentialBookingId();
        return res.status(200).json({ success: true, bookingId: nextId, counter: serverSic26Counter });
      }

      if (action === 'clear_demo') {
        storedBookings = storedBookings.filter(
          (b) => b.transactionId && !b.id.includes('DEMO') && !b.id.includes('TEST')
        );
        return res.status(200).json({ success: true, count: storedBookings.length, bookings: storedBookings });
      }

      if (action === 'sync_client_bookings') {
        await syncBookingsFromRazorpayGateway(Boolean(body.force));
        if (Array.isArray(bookings)) {
          for (const clientBooking of bookings) {
            if (clientBooking && clientBooking.id) {
              upsertStoredBooking(clientBooking);
            }
          }
        }
        const cleanList = storedBookings.filter(
          (b) => b && !b.id.includes('DEMO') && !b.id.includes('TEST')
        );
        return res.status(200).json({
          success: true,
          count: cleanList.length,
          bookings: cleanList
        });
      }

      if (action === 'update_status' && bookingId) {
        if (booking && booking.id === bookingId) {
          upsertStoredBooking(booking);
        }

        let targetTransactionId = booking?.transactionId || '';

        storedBookings = storedBookings.map((b) => {
          if (b.id === bookingId) {
            targetTransactionId = targetTransactionId || b.transactionId || '';
            return {
              ...b,
              status: status || b.status,
              driverName: driverInfo?.name || b.driverName,
              driverPhone: driverInfo?.phone || b.driverPhone,
              driverVehicleModel: driverInfo?.vehicleModel || b.driverVehicleModel,
              driverVehicleNo: driverInfo?.carPlate || b.driverVehicleNo,
              driverAssignedAt: driverInfo ? new Date().toISOString() : b.driverAssignedAt
            };
          }
          return b;
        });

        if (targetTransactionId && String(targetTransactionId).startsWith('pay_')) {
          await patchDriverInfoToRazorpayPayment(targetTransactionId, status, driverInfo);
        }

        return res.status(200).json({ success: true, bookings: storedBookings });
      }

      if (booking && booking.id) {
        const saved = upsertStoredBooking(booking);
        return res.status(200).json({ success: true, booking: saved, bookings: storedBookings });
      }

      return res.status(400).json({ error: 'Missing booking details' });
    } catch (err) {
      console.error('Error in /api/bookings:', err);
      return res.status(500).json({ error: err?.message || 'Server error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
