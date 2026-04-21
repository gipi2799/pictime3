import { GalleryClient } from "@/components/gallery/GalleryClient";

export default function PublicGalleryPage({ params }: { params: { slug: string } }) {
  return <GalleryClient slug={params.slug} />;
}
