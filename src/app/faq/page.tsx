// src/app/faq/page.tsx
// OPDATERET (nyt navn: FiskoMan). Ofte stillede spørgsmål. Offentlig side. Linker videre til Flex-forklaringen (/flex) og reglerne (/regler).

import type { Metadata } from "next";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import InfoPage from "@/components/info-page";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Svar på de mest almindelige spørgsmål om FiskoMan: opslag, grupper, badges, Flex, privatliv og regler.",
};

type QA = { q: string; a: React.ReactNode };

const A = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <Link href={href} className="font-semibold text-deep-900 underline">
    {children}
  </Link>
);

const SECTIONS: { title: string; items: QA[] }[] = [
  {
    title: "Kom i gang",
    items: [
      {
        q: "Hvad er FiskoMan?",
        a: "Et socialt netværk for danske lystfiskere. Du kan dele opslag og fangster, følge andre fiskere, være med i grupper og samle badges.",
      },
      { q: "Koster det noget?", a: "Nej. Det er gratis at oprette en profil og bruge FiskoMan." },
      {
        q: "Hvordan opretter jeg en profil?",
        a: (
          <>
            Gå til <A href="/login">log ind</A> og vælg Google eller email. Første gang skal du vælge et brugernavn og fortælle lidt om dig
            selv.
          </>
        ),
      },
      {
        q: "Hvordan ændrer jeg min profil?",
        a: "Tryk på tandhjulet på din profil eller gå til Indstillinger. Her kan du ændre navn, brugernavn, by, landsdel, erfaring, bio og profilbillede.",
      },
    ],
  },
  {
    title: "Opslag",
    items: [
      {
        q: "Hvad kan jeg dele?",
        a: "Alt om fiskeri: en fangst, en tur, et spørgsmål eller bare en god dag ved vandet. Du kan tilføje op til 5 billeder, en følelse, et sted og tagge dine venner. Er opslaget en fangst, kan du vælge art, vægt og længde.",
      },
      {
        q: "Hvem kan se mine opslag?",
        a: "Du vælger selv for hvert opslag: Offentlig (alle), Følgere (kun dem der følger dig) eller Privat (kun dig). Opslag i en gruppe følger gruppen: i en privat gruppe kan kun medlemmer se dem.",
      },
      {
        q: "Bliver min placering vist på billederne?",
        a: "Nej. Når du uploader et billede, fjerner vi automatisk de skjulte oplysninger i filen, også GPS-positionen. Kun det sted, du selv skriver, bliver vist.",
      },
      {
        q: "Kan jeg slette et opslag?",
        a: "Ja. Tryk på ••• på dit opslag og vælg Slet opslag. Billeder, kommentarer og reaktioner bliver slettet med.",
      },
      {
        q: "Hvad betyder Anbefalet og Nyeste i feedet?",
        a: "Nyeste viser de nyeste opslag først. Anbefalet blander, så du ser mere fra dine venner, dem du følger, dine grupper og fiskere i dit område, men stadig også nye opslag og dem, der får mange reaktioner.",
      },
      {
        q: "Hvorfor skal jeg vælge en landsdel?",
        a: "Så kan vi vise dig flere opslag fra fiskere tæt på dig. Vi gætter den ud fra din by, men du kan altid ændre den i Indstillinger.",
      },
    ],
  },
  {
    title: "Venner, følgere og grupper",
    items: [
      {
        q: "Hvad er forskellen på at følge og at være venner?",
        a: "Du kan følge alle. Når I følger hinanden, er I venner, og så kan I tagge hinanden i opslag.",
      },
      {
        q: "Hvordan kommer jeg med i en gruppe?",
        a: "Du accepterer gruppens regler og sender en anmodning, som gruppens admin godkender. I en offentlig gruppe kan alle læse med, men kun medlemmer kan skrive. I en privat gruppe kan kun medlemmer se opslagene.",
      },
      {
        q: "Kan jeg lave min egen gruppe?",
        a: "Ja. Under Grupper kan du oprette en gruppe, skrive regler og godkende nye medlemmer. Du bliver selv admin.",
      },
    ],
  },
  {
    title: "Badges, rekorder og Flex",
    items: [
      {
        q: "Hvordan får jeg badges?",
        a: "Ved at dele fangster: din første fangst, 10, 50 og 100 fangster, nye arter, trofæer, genudsætninger, vinterfiskeri og 10 fangster af samme art. Du kan se dine badges og dem, du mangler, på din profil.",
      },
      {
        q: "Hvad er fiskepasset?",
        a: "En oversigt på din profil over alle arter, du har fanget, med din bedste vægt og længde for hver.",
      },
      {
        q: "Hvad betyder PR og Ny art?",
        a: "PR betyder personlig rekord: fangsten er din tungeste eller længste af den art. Ny art betyder, at det er første gang, du deler en fangst af den art.",
      },
      {
        q: "Hvad er Flex?",
        a: (
          <>
            Flex er det, man siger, når stangen bøjer. Det er din rating på FiskoMan. Du får Flex, når andre giver dine opslag Knæk og
            bræk, kommenterer, deler eller følger dig, og når du får badges eller klarer en månedsudfordring.{" "}
            <A href="/flex">Læs hele forklaringen og se, hvem der har mest Flex</A>.
          </>
        ),
      },
    ],
  },
  {
    title: "Tryghed og regler",
    items: [
      {
        q: "Hvilke regler gælder?",
        a: (
          <>
            Vær ordentlig over for andre, overhold fiskeriloven, og del kun dit eget indhold. <A href="/regler">Læs alle reglerne</A>.
          </>
        ),
      },
      {
        q: "Hvordan rapporterer jeg noget?",
        a: "Tryk på ••• på et opslag eller en profil, eller på Rapportér under en kommentar. Vi ser på alle rapporter. Den, du rapporterer, får ikke at vide, at det var dig.",
      },
      {
        q: "Hvad sker der, når jeg blokerer nogen?",
        a: "I kan ikke længere se hinandens opslag og kommentarer, og I holder op med at følge hinanden. Personen får ikke besked. Du kan fjerne blokeringen igen under Indstillinger.",
      },
      {
        q: "Hvad sker der, hvis man bryder reglerne?",
        a: "Vi kan slette indholdet og bortvise profilen i en periode eller permanent. Er man bortvist, kan man ikke logge ind, og ens opslag er skjult.",
      },
    ],
  },
  {
    title: "Konto og privatliv",
    items: [
      {
        q: "Hvordan sletter jeg min konto?",
        a: "Under Indstillinger → Slet konto. Alt, du har delt, bliver slettet: profil, opslag, billeder, kommentarer, reaktioner, følgere og badges.",
      },
      {
        q: "Hvad gør I med mine oplysninger?",
        a: (
          <>
            Det kan du læse i vores <A href="/privatliv">privatlivspolitik</A>.
          </>
        ),
      },
      {
        q: "Jeg har et spørgsmål, der ikke står her",
        a: (
          <>
            Skriv til{" "}
            <a href="mailto:kontakt@fiskoman.dk" className="font-semibold text-deep-900 underline">
              kontakt@fiskoman.dk
            </a>
            .
          </>
        ),
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <InfoPage title="FAQ" intro="Svar på de spørgsmål, vi oftest får. Tryk på et spørgsmål for at se svaret.">
      {SECTIONS.map((s) => (
        <section key={s.title}>
          <h2 className="mb-3 text-lg font-semibold text-deep-950">{s.title}</h2>
          <div className="divide-y divide-mist-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-mist-100">
            {s.items.map((item) => (
              <details key={item.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 font-medium text-deep-950 hover:bg-mist-50 [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-deep-700 transition group-open:rotate-180" aria-hidden />
                </summary>
                <div className="px-4 pb-4 text-[15px] leading-relaxed text-deep-800">{item.a}</div>
              </details>
            ))}
          </div>
        </section>
      ))}
    </InfoPage>
  );
}
