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
  whatsappNumber: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '491701234567',
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL || 'https://instagram.com/barbershop_cottbus',
  tiktokUrl: process.env.NEXT_PUBLIC_TIKTOK_URL || 'https://tiktok.com/@barbershop_cottbus',
  writeReviewUrl: process.env.NEXT_PUBLIC_WRITE_REVIEW_URL || 'https://search.google.com/local/writereview?placeid=ChIJ81T_XXXXX',
  googleProfileUrl: process.env.NEXT_PUBLIC_GOOGLE_PROFILE_URL || 'https://maps.google.com/?cid=12345678901234567890',
  geo: {
    lat: parseFloat(process.env.NEXT_PUBLIC_GEO_LAT || '51.75631'),
    lng: parseFloat(process.env.NEXT_PUBLIC_GEO_LNG || '14.33286'),
  },
  mapEmbedUrl: process.env.NEXT_PUBLIC_MAP_EMBED_URL || 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2449.1234567890!2d14.33286!3d51.75631!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNTHCsDQ1JzIyLjciTiAxNCsxOSc1OC4zIkU!5e0!3m2!1sde!2sde!4v1234567890123',
};
