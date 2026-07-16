export interface SiteConfig {
  whatsappNumber: string;
  instagramUrl?: string;
  tiktokUrl?: string;
  writeReviewUrl: string;
  googleProfileUrl: string;
  geo: {
    lat: number;
    lng: number;
  };
  mapEmbedUrl: string;
}

export const siteConfig: SiteConfig = {
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '4917682200682',
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://www.instagram.com/azzam_salon_barbershop/',
  tiktokUrl: process.env.NEXT_PUBLIC_TIKTOK_URL || undefined,
  writeReviewUrl: process.env.NEXT_PUBLIC_WRITE_REVIEW_URL || 'https://www.google.com/maps/place/Azzam+Barbershop/@51.783282,14.3146129,861m/data=!3m2!1e3!5s0x470874fd97d24d47:0x7bebd662eb689ca3!4m8!3m7!1s0x4708750037138a3d:0x93eac844e87e665a!8m2!3d51.783282!4d14.3171932!9m1!1b1!16s%2Fg%2F11vrkb7907',
  googleProfileUrl: process.env.NEXT_PUBLIC_GOOGLE_PROFILE_URL || 'https://www.google.com/maps/place/Azzam+Barbershop/@51.783282,14.3146129,861m/data=!3m2!1e3!5s0x470874fd97d24d47:0x7bebd662eb689ca3!4m8!3m7!1s0x4708750037138a3d:0x93eac844e87e665a!8m2!3d51.783282!4d14.3171932!9m1!1b1!16s%2Fg%2F11vrkb7907',
  geo: {
    lat: parseFloat(process.env.NEXT_PUBLIC_GEO_LAT || '51.75631'),
    lng: parseFloat(process.env.NEXT_PUBLIC_GEO_LNG || '14.33286'),
  },
  mapEmbedUrl: process.env.NEXT_PUBLIC_MAP_EMBED_URL || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2449.1234567890!2d14.33286!3d51.75631!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTHCsDQ1JzIyLjciTiAxNCsxOSc1OC4zIkU!5e0!3m2!1sde!2sde!4v1234567890123',
};
