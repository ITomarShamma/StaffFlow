// All UI strings (CLAUDE.md rule 2). Sources: spec Appendix A and the design handoff
// (docs/design). Anything from neither carries a `// TODO-COPY` comment for review.
// Digits are Western; the product name stays the Latin wordmark "StaffFlow".

export const ar = {
  brand: "StaffFlow",

  nav: {
    login: "تسجيل الدخول",
    username: "اسم المستخدم",
    password: "كلمة المرور",
    signIn: "دخول",
    wrongCredentials: "اسم المستخدم أو كلمة المرور غير صحيحة",
    forbidden: "غير مصرح لك بالوصول إلى هذه الصفحة",
    logout: "تسجيل الخروج",
    home: "الرئيسية",
    board: "اللوحة الحية",
    leave: "الإجازات",
    leaveRequests: "طلبات الإجازة",
    leaveDecisions: "قرارات الإجازة",
    corrections: "التصحيحات",
    dailySummary: "الملخص اليومي",
    leaveBalances: "أرصدة الإجازات",
    demoMode: "وضع العرض التجريبي",
  },

  roles: {
    agent: "موظف خدمة عملاء",
    team_lead: "مشرف",
    branch_manager: "مدير الفرع",
  },

  status: {
    on_floor: "متواجد",
    on_break: "في استراحة",
    overrun: "تجاوز المدة",
    away: "في إجازة ساعية",
    on_leave: "في إجازة",
  },

  breaks: {
    smoke: "استراحة تدخين",
    prayer: "استراحة صلاة",
    meal: "استراحة طعام",
    toilet: "دورة مياه",
    backOnFloor: "عودة إلى العمل",
    busy: "مشغول — حاول بعد قليل",
    unavailable: "غير متاح اليوم",
    generalPool: "المجموعة العامة",
    toiletWomen: "دورة مياه — نساء",
    toiletMen: "دورة مياه — رجال",
    generalCap: "الحد الأقصى للمجموعة العامة",
    budgetUsed: "الرصيد المستخدم",
    // Tile counters, from the Appendix A example "تدخين 3/5 · صلاة 1/1 · طعام 0/1"
    counterSmoke: "تدخين",
    counterPrayer: "صلاة",
    counterMeal: "طعام",
    counterSeparator: " · ",
    autoEnded: "إنهاء تلقائي",
    stale: "لم يُسجَّل الإنهاء",
    endOfDay: "نهاية الدوام",
    edited: "معدّل",
    todaySessions: "استراحات اليوم",
    start: "البداية",
    end: "النهاية",
    duration: "المدة",
    editEnd: "تعديل وقت الانتهاء",
    voidSession: "إلغاء الاستراحة",
    noteRequired: "ملاحظة (إلزامية)",
    save: "حفظ",
    cancel: "إلغاء",
    noSessionsToday: "لا توجد استراحات اليوم",
  },

  leave: {
    newRequest: "طلب جديد",
    hourly: "إجازة ساعية",
    daily: "إجازة يومية",
    date: "التاريخ",
    from: "من",
    to: "إلى",
    startDate: "من تاريخ",
    endDate: "إلى تاريخ",
    reason: "السبب",
    submit: "إرسال",
    myRequests: "طلباتي",
    remainingBalance: "الرصيد المتبقي",
    requestedBy: "مقدم الطلب",
    hours: "الساعات",
    pending: "قيد المراجعة",
    approved: "مقبول",
    rejected: "مرفوض",
    cancelled: "ملغى",
    revoked: "تم سحب الموافقة",
    approve: "موافقة",
    reject: "رفض",
    revoke: "سحب الموافقة",
    decisionNote: "ملاحظة القرار (اختيارية)",
    exceedsBalance: "يتجاوز الرصيد المتبقي",
    overlaps: "يتعارض مع طلب آخر",
    noPending: "لا توجد طلبات قيد المراجعة",
  },

  table: {
    agent: "الموظف",
    count: "العدد",
    minutes: "الدقائق",
    overruns: "التجاوزات",
    used: "المستخدم",
    remaining: "المتبقي",
    day: "يوم",
    exportCsv: "تصدير CSV",
  },

  // From the design handoff (docs/design/StaffFlow.dc.html, StaffFlow Screens.dc.html)
  design: {
    summary: {
      smoke: "تدخين",
      prayer: "صلاة",
      meal: "طعام",
      toilet: "دورة مياه",
      leave: "الإجازة",
    },
    csvHeaders: [
      "الموظف",
      "الرصيد المستخدم",
      "تدخين — العدد",
      "تدخين — الدقائق",
      "صلاة — العدد",
      "صلاة — الدقائق",
      "طعام — العدد",
      "طعام — الدقائق",
      "دورة مياه — العدد",
      "التجاوزات",
      "إنهاء تلقائي",
      "معدّل",
      "الإجازة — الساعات",
      "الإجازة — يوم",
    ],
    balances: {
      usedDays: "المستخدم (يوم)",
      remainingDays: "المتبقي (يوم)",
    },
    closeDialog: "إلغاء",
  },

  // Strings in neither the spec nor the design handoff.
  todo: {
    demoJumpTo: "انتقال إلى", // TODO-COPY demo-mode clock control: jump to a time today
    demoNextDay: "اليوم التالي", // TODO-COPY demo-mode clock control: jump to next day 08:00
    demoJumpBack: "لا يمكن الرجوع بالزمن", // TODO-COPY demo clock: backward jump refused
    checkFields: "تحقق من الحقول", // TODO-COPY generic form validation failure
    correctionTooOld: "لا يمكن تعديل استراحة أقدم من 7 أيام", // TODO-COPY §5.5 window
    correctionOpen: "الاستراحة ما زالت جارية", // TODO-COPY correction on an open session
    correctionVoided: "الاستراحة ملغاة", // TODO-COPY correction on a voided session
    invalidEndTime: "وقت انتهاء غير صالح", // TODO-COPY end ≤ start or in the future
    notAllowed: "الإجراء غير مسموح", // TODO-COPY lifecycle refusal (e.g. approving a non-pending request)
    pageTitleSuffix: "StaffFlow",

    // TODO-COPY leave refusals — Appendix A has only «يتجاوز الرصيد المتبقي» and
    // «يتعارض مع طلب آخر»; every other cause used to fail silently (fixed 2026-09-10).
    leaveErrors: {
      dateInvalid: "اختر تاريخاً صالحاً", // TODO-COPY hourly date missing or not a real date
      timeInvalid: "اختر وقت البداية والنهاية", // TODO-COPY from/to missing or not HH:mm
      timeOrder: "وقت النهاية يجب أن يكون بعد وقت البداية", // TODO-COPY from ≥ to
      outsideWorkHours: (start: string, end: string) => `الوقت خارج ساعات الدوام (${start} – ${end})`, // TODO-COPY
      startDateInvalid: "اختر تاريخ البداية", // TODO-COPY
      endDateInvalid: "اختر تاريخ النهاية", // TODO-COPY
      dateOrder: "تاريخ النهاية قبل تاريخ البداية", // TODO-COPY
      crossesYear: "لا يمكن أن يمتد الطلب على سنتين — قدّم طلبين منفصلين", // TODO-COPY decision A25
      reasonRequired: "السبب مطلوب", // TODO-COPY spec §6 requires a reason
      reasonTooLong: "السبب طويل جداً", // TODO-COPY over 200 characters
      serverError: "تعذّر إرسال الطلب، حاول مرة أخرى", // TODO-COPY unexpected server failure
      cancelFailed: "تعذّر إلغاء الطلب، حاول مرة أخرى", // TODO-COPY unexpected server failure
    },

    // TODO-COPY time picker — hour and minute columns instead of a bare text field.
    timePicker: {
      open: "اختيار الوقت", // TODO-COPY aria-label on the clock button
      hour: "ساعة", // TODO-COPY hour column heading
      minute: "دقيقة", // TODO-COPY minute column heading
      placeholder: "--:--", // TODO-COPY empty time field
      done: "تم", // TODO-COPY closes the picker
    },
  },
} as const;

export type ArStrings = typeof ar;
