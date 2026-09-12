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
    monthlyReport: "التقرير الشهري", // TODO-COPY decision 2026-09-12; not in Appendix A
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
    smoke: "استراحة قصيرة", // user decision 2026-09-12 (Appendix A had «استراحة تدخين»)
    prayer: "استراحة صلاة",
    meal: "استراحة طعام",
    toilet: "دورة مياه",
    call: "مكالمة هاتفية", // TODO-COPY 5th break type (decision 2026-09-10); not in Appendix A
    backOnFloor: "عودة إلى العمل",
    busy: "مشغول — حاول بعد قليل",
    unavailable: "غير متاح اليوم",
    generalPool: "المجموعة العامة",
    toiletWomen: "دورة مياه — نساء",
    toiletMen: "دورة مياه — رجال",
    generalCap: "الحد الأقصى للمجموعة العامة",
    budgetUsed: "الرصيد المستخدم",
    // Tile counters, from the Appendix A example "تدخين 3/5 · صلاة 1/1 · طعام 0/1"
    counterSmoke: "قصيرة", // user decision 2026-09-12
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
      smoke: "استراحة قصيرة", // user decision 2026-09-12
      prayer: "صلاة",
      meal: "طعام",
      toilet: "دورة مياه",
      call: "مكالمات", // TODO-COPY 5th break type column (decision 2026-09-10)
      leave: "الإجازة",
    },
    csvHeaders: [
      "الموظف",
      "الرصيد المستخدم",
      "استراحة قصيرة — العدد",
      "استراحة قصيرة — الدقائق",
      "صلاة — العدد",
      "صلاة — الدقائق",
      "طعام — العدد",
      "طعام — الدقائق",
      "دورة مياه — العدد",
      "مكالمات — العدد",
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
    requestedAt: "وقت تسجيل الطلب", // TODO-COPY decision 2026-09-12: when a leave request was submitted

    // TODO-COPY change password from the login screen (decision 2026-09-12)
    password: {
      link: "تغيير كلمة المرور",
      title: "تغيير كلمة المرور",
      current: "كلمة المرور الحالية",
      next: "كلمة المرور الجديدة",
      confirm: "تأكيد كلمة المرور الجديدة",
      save: "حفظ كلمة المرور الجديدة",
      back: "العودة إلى تسجيل الدخول",
      changed: "تم تغيير كلمة المرور. سجّل الدخول بكلمة المرور الجديدة.",
      tooShort: (n: number) => `كلمة المرور الجديدة قصيرة: ${n} أحرف على الأقل`,
      mismatch: "كلمتا المرور الجديدتان غير متطابقتين",
      sameAsCurrent: "كلمة المرور الجديدة يجب أن تختلف عن الحالية",
    },

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
      datePast: "لا يمكن طلب إجازة عن تاريخ مضى", // TODO-COPY decision 2026-09-10
      startDatePast: "لا يمكن أن تبدأ الإجازة قبل اليوم", // TODO-COPY decision 2026-09-10
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

    // TODO-COPY reports (decision 2026-09-12): the formatted Excel export and the monthly report.
    reports: {
      exportExcel: "تصدير Excel", // TODO-COPY
      org: "شام كاش · فرع خدمة العملاء", // TODO-COPY title block of exported sheets
      month: "الشهر", // TODO-COPY
      date: "التاريخ", // TODO-COPY
      issuedAt: "تاريخ الإصدار", // TODO-COPY
      staffCount: "عدد الموظفين", // TODO-COPY
      daysAtWork: "أيام الدوام", // TODO-COPY working days minus days on daily leave
      budgetMinutes: "الرصيد المستخدم (دقيقة)", // TODO-COPY
      avgPerDay: "المتوسط اليومي (دقيقة)", // TODO-COPY
      total: "المجموع", // TODO-COPY totals row
      leaveDays: "الأيام", // TODO-COPY leave column, monthly
      coverage: (from: string, to: string, n: number) => `أيام الدوام المشمولة: من ${from} إلى ${to} · العدد ${n}`, // TODO-COPY
      noDays: "لا توجد أيام دوام في هذا الشهر حتى الآن", // TODO-COPY
      pageFooter: "صفحة &P من &N", // TODO-COPY Excel page footer (&P/&N are Excel codes)
      weekdays: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"], // TODO-COPY
      months: ["كانون الثاني", "شباط", "آذار", "نيسان", "أيار", "حزيران", "تموز", "آب", "أيلول", "تشرين الأول", "تشرين الثاني", "كانون الأول"], // TODO-COPY Levantine month names
    },
  },
} as const;

export type ArStrings = typeof ar;
