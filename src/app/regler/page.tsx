// src/app/regler/page.tsx
// NY FIL. Generelle regler for HookedSpace. Offentlig side. Ret datoen i LAST_UPDATED, når reglerne ændres.

import type { Metadata } from "next";
import Link from "next/link";
import InfoPage from "@/components/info-page";

const LAST_UPDATED = "31. oktober 2026";

export const metadata: Metadata = {
  title: "Regler",
  description: "Reglerne for HookedSpace: god tone, fiskeriloven, ærlige opslag og hvad der sker, hvis reglerne brydes.",
};

const RULES: { title: string; points: string[] }[] = [
  {
    title: "1. Vær ordentlig",
    points: [
      "Tal pænt til og om andre, også når I er uenige.",
      "Ingen chikane, mobning, trusler eller hån af andres fangster, udstyr eller erfaring.",
      "Ingen racisme, sexisme eller anden nedsættende omtale af grupper af mennesker.",
      "Alle har været begyndere. Hjælp hellere end at gøre grin.",
    ],
  },
  {
    title: "2. Overhold fiskeriloven",
    points: [
      "Del ikke fangster, der er taget i fredningstiden eller er under mindstemålet, medmindre fisken er genudsat.",
      "Opfordr ikke til ulovligt fiskeri, fx fiskeri uden fisketegn, i fredningsbælter eller med ulovlige redskaber.",
      "Behandl fisk ordentligt. Ingen billeder eller videoer af dyrplageri.",
    ],
  },
  {
    title: "3. Del kun dit eget indhold",
    points: [
      "Del kun billeder, du selv har taget eller har lov til at bruge.",
      "Fangster skal være dine egne og rigtige. Snyd ikke med vægt, længde eller art.",
      "Vil du vise et andet menneske på et billede, så spørg dem først.",
    ],
  },
  {
    title: "4. Respekter andres privatliv",
    points: [
      "Del ikke andres private oplysninger som adresse, telefonnummer eller nummerplade.",
      "Del ikke andres private fiskepladser uden deres lov.",
      "Tag kun folk i opslag, som rent faktisk var med.",
    ],
  },
  {
    title: "5. Ingen spam eller reklame",
    points: [
      "Ingen gentagne opslag, kædebreve eller links til tvivlsomme sider.",
      "Ingen reklame for egne produkter eller tjenester uden aftale med os.",
      "Ingen falske profiler, og ingen der udgiver sig for at være en anden.",
    ],
  },
  {
    title: "6. Intet ulovligt eller upassende indhold",
    points: [
      "Intet pornografisk, voldeligt eller på anden måde stødende indhold.",
      "Intet salg af ulovlige varer, våben eller fredede arter.",
      "Børn skal kunne være på HookedSpace. Hold indholdet derefter.",
    ],
  },
  {
    title: "7. Grupper",
    points: [
      "Gruppens admins kan lave ekstra regler for deres gruppe. Dem skal du også følge.",
      "Reglerne her gælder altid, også i private grupper.",
    ],
  },
];

export default function ReglerPage() {
  return (
    <InfoPage
      title="Regler"
      intro={
        <>
          <p>
            HookedSpace skal være et godt sted for alle, der elsker fiskeri. Derfor har vi nogle få regler. De gælder i opslag,
            kommentarer, profiler og grupper.
          </p>
          <p className="mt-1 text-sm text-deep-700">Senest opdateret: {LAST_UPDATED}</p>
        </>
      }
    >
      <div className="space-y-4">
        {RULES.map((r) => (
          <section key={r.title} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-mist-100">
            <h2 className="mb-2 text-lg font-semibold text-deep-950">{r.title}</h2>
            <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-deep-800 marker:text-reed-500">
              {r.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="rounded-2xl bg-deep-900 p-5 text-mist-50">
        <h2 className="mb-2 text-lg font-semibold">Hvis reglerne bliver brudt</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed marker:text-lure-400">
          <li>Ser du noget, der bryder reglerne, så rapportér det via ••• på opslaget eller profilen. Den, du rapporterer, får ikke at vide, at det var dig.</li>
          <li>Vi kan slette indhold, der bryder reglerne, uden varsel.</li>
          <li>Ved gentagne eller grove brud kan profilen blive bortvist i en periode eller permanent.</li>
          <li>Er du uenig i en afgørelse, kan du skrive til kontakt@hookedspace.com.</li>
        </ul>
      </section>

      <p className="text-sm text-deep-700">
        Har du spørgsmål, så se vores <Link href="/faq" className="font-semibold text-deep-900 underline">FAQ</Link> eller{" "}
        <Link href="/privatliv" className="font-semibold text-deep-900 underline">privatlivspolitikken</Link>.
      </p>
    </InfoPage>
  );
}
