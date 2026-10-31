// src/app/privatliv/page.tsx
// OPDATERET (nyt navn: FiskoMan). Privatlivspolitik (GDPR). Offentlig side. Ret oplysningerne i KONFIG øverst, før siden går live.

import type { Metadata } from "next";
import Link from "next/link";
import { LogoBadge } from "@/components/logo";

// ---------- KONFIG: tjek og ret disse oplysninger ----------
const CONTROLLER_NAME = "Mick Ogilvie";
const CONTROLLER_ADDRESS = "Kolding, Danmark";
const CONTACT_EMAIL = "kontakt@fiskoman.dk";
const SUPABASE_REGION = "EU (Frankfurt, Tyskland)";
const MIN_AGE = 15;
const LAST_UPDATED = "16. oktober 2026";
// -----------------------------------------------------------

export const metadata: Metadata = {
  title: "Privatlivspolitik",
  description: "Sådan behandler FiskoMan dine personoplysninger.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-deep-950">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-deep-800">{children}</div>
    </section>
  );
}

export default function PrivatlivPage() {
  return (
    <div className="min-h-dvh">
      <header className="bg-deep-900">
        <div className="mx-auto flex h-16 max-w-3xl items-center px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-mist-50">
            <LogoBadge size="md" />
            FiskoMan
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-3xl font-bold text-deep-950">Privatlivspolitik</h1>
        <p className="mt-2 text-sm text-deep-700">Senest opdateret: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-10 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-mist-100 sm:p-8">
          <Section title="1. Hvem er dataansvarlig?">
            <p>
              FiskoMan drives af {CONTROLLER_NAME}, {CONTROLLER_ADDRESS}. Vi er dataansvarlige for de
              personoplysninger, du giver os, når du bruger fiskoman.dk.
            </p>
            <p>
              Har du spørgsmål om dine data, kan du skrive til{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-deep-900 underline">
                {CONTACT_EMAIL}
              </a>
              .
            </p>
          </Section>

          <Section title="2. Hvilke oplysninger gemmer vi?">
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Konto:</strong> email og adgangskode (adgangskoden gemmes krypteret, og vi kan ikke se den). Logger du ind med Google, får vi dit navn, din email og dit Google-profilbillede.</li>
              <li><strong>Profil:</strong> navn, brugernavn, by, erfaringsniveau, &quot;om mig&quot;-tekst og profilbillede.</li>
              <li><strong>Opslag:</strong> tekst, billeder, følelse, sted, fangstdetaljer og de venner, du tagger.</li>
              <li><strong>Forbindelser:</strong> hvem du følger, og hvem der følger dig.</li>
              <li><strong>Teknisk:</strong> login-cookies, der holder dig logget ind, og almindelige serverlogs (IP-adresse og tidspunkt), som vores hostingudbydere gemmer i kort tid af sikkerhedshensyn.</li>
            </ul>
          </Section>

          <Section title="3. Billeder og GPS-data">
            <p>
              Billeder fra mobiltelefoner indeholder ofte den præcise GPS-position, hvor billedet er taget. Vi
              fjerner <strong>alle</strong> metadata, også GPS, i din browser, før billedet bliver sendt til os.
              Positionen når altså aldrig vores servere.
            </p>
            <p>
              Feltet &quot;Sted&quot; i et opslag er fri tekst, som du selv skriver. Vi anbefaler at skrive et område
              frem for en præcis plads.
            </p>
          </Section>

          <Section title="4. Hvem kan se dine oplysninger?">
            <ul className="list-disc space-y-1 pl-5">
              <li>Din profil (navn, brugernavn, by, erfaring, om mig og profilbillede) kan ses af andre brugere.</li>
              <li>Dine opslag kan ses af dem, du vælger: <strong>Offentlig</strong>, <strong>Følgere</strong> eller <strong>Kun mig</strong>.</li>
              <li>Offentlige opslag kan ses af alle, også uden login, og kan deles med et link. De kan derfor også blive fundet af søgemaskiner.</li>
              <li>Din email bliver aldrig vist for andre brugere.</li>
              <li>Billeder gemmes med lange, tilfældige adresser, som ikke kan gættes.</li>
            </ul>
          </Section>

          <Section title="5. Hvorfor behandler vi oplysningerne?">
            <p>
              Vi behandler dine oplysninger for at kunne levere tjenesten til dig: oprette din konto, vise din
              profil og dine opslag og forbinde dig med andre lystfiskere. Retsgrundlaget er
              databeskyttelsesforordningens artikel 6, stk. 1, litra b (opfyldelse af aftalen med dig).
            </p>
            <p>
              Serverlogs og sikkerhed behandles med hjemmel i artikel 6, stk. 1, litra f (vores legitime
              interesse i at holde tjenesten sikker).
            </p>
            <p>Vi sælger aldrig dine oplysninger, og vi bruger dem ikke til reklamer.</p>
          </Section>

          <Section title="6. Cookies">
            <p>
              Vi bruger kun de cookies, der er nødvendige for at holde dig logget ind. Vi bruger ingen cookies til
              statistik, sporing eller reklame. Derfor viser vi ikke et cookie-banner.
            </p>
          </Section>

          <Section title="7. Databehandlere">
            <p>Vi bruger følgende udbydere til at drive FiskoMan. De må kun behandle data efter vores anvisninger:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li><strong>Supabase</strong> – database, login og billedlagring. Data ligger i {SUPABASE_REGION}.</li>
              <li><strong>Vercel</strong> – hosting af hjemmesiden. Vercel er certificeret under EU-US Data Privacy Framework.</li>
              <li><strong>Google</strong> – kun hvis du vælger at logge ind med Google.</li>
            </ul>
          </Section>

          <Section title="8. Hvor længe gemmer vi dine data?">
            <p>
              Vi gemmer dine oplysninger, så længe du har en konto.
            </p>
            <p>
              Du kan selv slette et opslag med ••• på opslaget. Billederne og kommentarerne slettes med det samme.
            </p>
            <p>
              Du kan selv slette din konto under Indstillinger. Så sletter vi med det samme din profil, dine opslag,
              billeder, kommentarer, reaktioner, forbindelser, badges og notifikationer. Sikkerhedskopier hos vores
              databaseudbyder slettes automatisk inden for 30 dage.
            </p>
          </Section>

          <Section title="9. Dine rettigheder">
            <p>Du har ret til at:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>få indsigt i de oplysninger, vi har om dig</li>
              <li>få forkerte oplysninger rettet (det meste kan du selv rette under Indstillinger)</li>
              <li>få dine oplysninger slettet (det kan du selv gøre under Indstillinger)</li>
              <li>få dine oplysninger udleveret i et almindeligt format (dataportabilitet)</li>
              <li>gøre indsigelse mod behandlingen eller få den begrænset</li>
            </ul>
            <p>
              Skriv til{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-medium text-deep-900 underline">
                {CONTACT_EMAIL}
              </a>
              , så svarer vi inden for 30 dage.
            </p>
            <p>
              Er du utilfreds med, hvordan vi behandler dine data, kan du klage til{" "}
              <a href="https://www.datatilsynet.dk" target="_blank" rel="noopener noreferrer" className="font-medium text-deep-900 underline">
                Datatilsynet
              </a>
              .
            </p>
          </Section>

          <Section title="10. Alder">
            <p>Du skal være mindst {MIN_AGE} år for at oprette en profil på FiskoMan.</p>
          </Section>

          <Section title="11. Ændringer">
            <p>
              Hvis vi ændrer denne politik væsentligt, giver vi besked på siden eller på email, før ændringen
              træder i kraft.
            </p>
          </Section>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link href="/" className="font-medium text-deep-700 hover:underline">
            Tilbage til forsiden
          </Link>
        </p>
      </main>
    </div>
  );
}
