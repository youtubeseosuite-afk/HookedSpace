// src/components/logo.tsx
// NY FIL. HookedSpace-logoet (krogen i cirklen) som vektor.
// <Logo> tegner kun mærket i den aktuelle tekstfarve. <LogoBadge> er mærket på en hvid, afrundet flade (som app-ikonet).

const PATH =
  "M 486 51 C 450 54,428 58,400 65 C 263 101,142 197,80 319 C 55 368,39 422,32 477 C 30 498,30 555,32 574 C 39 626,57 675,81 713 C 88 723,88 722,85 709 C 68 643,63 561,72 497 C 92 359,168 238,281 164 C 347 121,413 96,491 85 C 509 83,556 82,576 84 C 658 93,727 119,802 173 C 806 176,809 178,810 178 C 812 176,796 155,783 143 C 734 95,659 63,573 52 C 560 51,498 50,486 51 M 950 117 C 930 120,882 139,864 152 C 836 172,829 186,804 260 C 744 440,714 528,701 562 C 665 653,641 698,605 738 C 554 795,493 829,424 840 C 407 842,365 842,350 840 C 295 831,250 806,216 767 C 155 695,157 619,223 538 C 230 530,249 510,250 511 C 250 511,250 514,249 517 C 248 526,247 541,248 547 L 249 552 253 543 C 265 518,279 501,300 485 C 344 452,413 436,461 448 C 471 451,471 450,461 443 C 412 412,332 413,264 445 C 207 473,149 528,123 581 C 101 625,95 670,104 720 C 128 853,260 928,426 903 C 553 884,658 805,719 681 C 751 619,773 549,816 378 C 840 283,849 262,871 239 C 884 226,892 221,940 198 C 977 181,990 168,991 148 C 992 127,975 114,950 117 M 947 132 C 948 134,949 136,949 139 C 949 148,946 152,919 171 C 905 180,892 192,892 195 C 892 197,903 195,913 192 C 932 186,951 175,961 165 C 977 149,970 129,949 129 L 945 129 947 132 M 874 266 C 877 271,881 277,883 280 C 913 324,937 383,946 435 C 955 483,954 542,944 586 C 931 649,907 697,861 755 C 845 775,804 815,780 832 C 703 891,609 928,512 939 C 418 949,335 938,256 904 C 242 898,242 899,258 910 C 319 952,384 972,464 974 C 517 975,560 969,622 954 C 814 906,961 763,989 594 C 997 550,996 501,988 456 C 972 374,934 305,883 267 C 868 255,867 255,874 266 M 815 336 C 814 339,804 365,799 379 C 783 424,718 618,719 620 C 720 620,723 613,728 604 C 754 551,773 497,802 391 C 804 380,809 363,812 353 C 815 343,817 334,817 334 C 816 334,816 335,815 336 M 153 644 C 150 658,151 687,155 704 C 166 755,202 801,247 824 C 259 830,289 840,291 839 C 291 839,285 835,277 831 C 221 803,184 762,166 707 C 159 688,156 672,154 644 L 153 640 153 644";

export function Logo({ className = "h-6 w-6", title }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="0 0 1024 1024"
      fill="currentColor"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path fillRule="evenodd" d={PATH} />
    </svg>
  );
}

// Størrelser: sm = 32px, md = 36px, lg = 44px, xl = 48px
const BADGE = {
  sm: { box: "h-8 w-8 rounded-lg", mark: "h-6 w-6" },
  md: { box: "h-9 w-9 rounded-lg", mark: "h-7 w-7" },
  lg: { box: "h-11 w-11 rounded-xl", mark: "h-8 w-8" },
  xl: { box: "h-12 w-12 rounded-xl", mark: "h-9 w-9" },
} as const;

export function LogoBadge({ size = "md", className = "" }: { size?: keyof typeof BADGE; className?: string }) {
  const s = BADGE[size];
  return (
    <span className={`flex shrink-0 items-center justify-center bg-white text-[#012a5b] ${s.box} ${className}`}>
      <Logo className={s.mark} />
    </span>
  );
}
