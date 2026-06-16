import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  configQuery,
  momentosQuery,
  presentesQuery,
  galeriaQuery,
  convidadosQuery,
} from "@/lib/wedding/queries";
import { SiteNav } from "@/components/wedding/SiteNav";
import { HeroSection } from "@/components/wedding/HeroSection";
import { StorySection } from "@/components/wedding/StorySection";
import { InfoSection } from "@/components/wedding/InfoSection";
import { RsvpSection } from "@/components/wedding/RsvpSection";
import { GiftsSection } from "@/components/wedding/GiftsSection";
import { GallerySection } from "@/components/wedding/GallerySection";
import { SiteFooter } from "@/components/wedding/SiteFooter";

export const Route = createFileRoute("/")({
  loader: ({ context }) => {
    context.queryClient.ensureQueryData(configQuery);
    context.queryClient.ensureQueryData(momentosQuery);
    context.queryClient.ensureQueryData(presentesQuery);
    context.queryClient.ensureQueryData(galeriaQuery);
    context.queryClient.ensureQueryData(convidadosQuery);
  },
  component: Home,
});

const MESES_CURTOS = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

function Home() {
  const { data: config } = useSuspenseQuery(configQuery);
  const { data: momentos } = useSuspenseQuery(momentosQuery);
  const { data: presentes } = useSuspenseQuery(presentesQuery);
  const { data: galeria } = useSuspenseQuery(galeriaQuery);
  const { data: convidados } = useSuspenseQuery(convidadosQuery);

  let dateLabel = "";
  if (config.data_casamento) {
    const d = new Date(config.data_casamento);
    dateLabel = `${String(d.getDate()).padStart(2, "0")} . ${MESES_CURTOS[d.getMonth()]} . ${d.getFullYear()}`;
  }
  const venue = config.cerimonia_local || "";

  return (
    <div className="bg-ivory text-charcoal">
      <SiteNav dateLabel={dateLabel} venue={venue} />
      <main className="pl-14 md:pl-24">
        <HeroSection config={config} />
        <StorySection momentos={momentos} />
        <InfoSection config={config} />
        <RsvpSection convidados={convidados} config={config} />
        <GiftsSection presentes={presentes} config={config} />
        <GallerySection fotos={galeria} />
        <SiteFooter config={config} />
      </main>
    </div>
  );
}
