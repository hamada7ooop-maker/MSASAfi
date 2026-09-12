import type { MasarifiDB } from '../schema';
import type { Transaction } from '@/types';
import { CategoryInitService } from '../services/categoryInitService';
import { useSettingsStore } from '@/store/settingsStore';
import { recordException } from '../../crashlytics';

export const DemoDataService = {
  async seedDemoData(db: MasarifiDB, clearFirst = false) {
    if (clearFirst) {
      await Promise.all(db.tables.map(t => t.name !== 'settings' ? t.clear() : Promise.resolve()));
    } else {
      await this.clearDemoData(db);
    }

    await CategoryInitService.initDefaultCategories(db, true);

    // Randomize time of day to feed Advanced Analytics
    const d = (monthsAgo: number, day: number) => {
      const dt = new Date();
      dt.setMonth(dt.getMonth() - monthsAgo);
      dt.setDate(day);
      dt.setHours(
        Math.floor(Math.random() * 24),
        Math.floor(Math.random() * 60),
        Math.floor(Math.random() * 60)
      );
      return dt.toISOString();
    };

    // ── 1. ACCOUNTS ──────────────────────────────────────────────────────
    const acc1 = `acc_bank_rajhi_${Date.now()}`;
    const acc2 = `acc_cash_wallet_${Date.now() + 1}`;
    const acc3 = `acc_invest_ahli_${Date.now() + 2}`;
    const acc4 = `acc_credit_visa_${Date.now() + 3}`;
    
    await db.accounts.bulkPut([
      { id: acc1, name: 'مصرف الراجحي - جاري',  type: 'bank',    balance: 42500, currency: 'SAR', color: '#002b59', icon: 'account_balance',   initialBalance: 15000, createdAt: Date.now(), isDemo: 1 },
      { id: acc2, name: 'المحفظة الشخصية',     type: 'cash',    balance: 2850,  currency: 'SAR', color: '#059669', icon: 'payments',           initialBalance: 1000,  createdAt: Date.now(), isDemo: 1 },
      { id: acc3, name: 'الأهلي كابيتال - تداول', type: 'savings', balance: 125000,currency: 'SAR', color: '#f59e0b', icon: 'trending_up',        initialBalance: 50000, createdAt: Date.now(), isDemo: 1 },
      { id: acc4, name: 'بطاقة فيزا الائتمانية',  type: 'credit',  balance: -4200, currency: 'SAR', color: '#ef4444', icon: 'credit_card',        initialBalance: 0,     createdAt: Date.now(), isDemo: 1 },
    ]);

    // Setup family members in settings
    await db.setSetting('familyMembers', [
      { id: 'fam_member_1', name: 'أميرة', relation: 'زوجة' },
      { id: 'fam_member_2', name: 'ماجد', relation: 'أخ' },
      { id: 'fam_member_3', name: 'أبو أحمد', relation: 'أب' }
    ]);

    // ── 2. TRANSACTIONS ──────────────────────────────────────────────────
    const txs: Transaction[] = [];
    const categories_exp = ['مواد غذائية', 'مواصلات', 'سكن', 'تسوق', 'ترفيه', 'صحة', 'تعليم', 'فواتير', 'جمال وعناية', 'رياضة', 'سفر', 'سيارة', 'هدايا', 'ديون', 'أخرى'];
    const descriptions: Record<string, string[]> = {
      'مواد غذائية': ['هايبر بنده', 'أسواق العثيم', 'لولو ماركت', 'بقالة الحي', 'مطعم بخاري', 'وجبة ماكدونالدز', 'قهوة ستاربكس'],
      'مواصلات': ['بنزين 95', 'أوبر', 'كريم', 'تجديد رخصة', 'مغسلة سيارات', 'تغيير زيت'],
      'سكن': ['إيجار الشقة', 'صيانة سباكة', 'فاتورة كهرباء', 'أثاث من ايكيا'],
      'تسوق': ['أمازون SA', 'ملابس من جرير', 'نمشي', 'نون', 'إلكترونيات'],
      'ترفيه': ['نتفليكس', 'سينما موفي', 'اشتراك نادي', 'رحلة استراحة'],
      'صحة': ['صيدلية الدواء', 'مستشفى الحبيب', 'فحص أسنان', 'فيتامينات'],
      'تعليم': ['كتب جرير', 'دورة يوديمي', 'اشتراك تعليمي'],
      'فواتير': ['فاتورة الاتصالات STC', 'فاتورة المياه', 'شحن سوا'],
      'جمال وعناية': ['صالون حلاقة', 'مستحضرات عناية', 'عطورات العربية للعود'],
      'رياضة': ['بروتين ومكملات', 'أدوات رياضية الفالح', 'تجديد اشتراك النادي'],
      'سفر': ['حجز تذاكر طيران', 'تأمين سفر', 'هدايا تذكارية'],
      'سيارة': ['فحص كمبيوتر', 'إطارات جديدة', 'تأمين ضد الغير'],
      'هدايا': ['باقة ورد', 'هدية زواج صديق', 'هدية عيد ميلاد'],
      'ديون': ['سداد دفعة صديق', 'سداد جزئي للتمويل'],
      'راتب': ['راتب الشهر الأساسي', 'بدل سكن', 'مكافأة أداء'],
      'استثمار': ['توزيعات أرباح', 'بيع أسهم', 'عوائد صكوك'],
      'عمل حر': ['تصميم شعار', 'برمجة تطبيق', 'استشارة تقنية']
    };

    const accNames: Record<string, string> = {
      [acc1]: 'مصرف الراجحي - جاري',
      [acc2]: 'المحفظة الشخصية',
      [acc3]: 'الأهلي كابيتال - تداول',
      [acc4]: 'بطاقة فيزا الائتمانية'
    };

    // Populate 12 Months of transactions
    for (let m = 0; m < 12; m++) {
      // Monthly Salary
      const salaryDate = d(m, 1);
      txs.push({
        id: `tx_inc_salary_${m}`,
        amount: 16500 + (Math.floor(Math.random() * 2000)),
        type: 'income',
        category: 'راتب',
        description: descriptions['راتب'][Math.floor(Math.random() * descriptions['راتب'].length)],
        date: salaryDate,
        createdAt: new Date(salaryDate).getTime(),
        accountId: acc1,
        account: accNames[acc1],
        isDemo: 1,
        necessity: 'need',
        mood: 'happy'
      });

      // Fixed Rent
      const rentDate = d(m, 5);
      txs.push({
        id: `tx_exp_rent_${m}`,
        amount: 2500,
        type: 'expense',
        category: 'سكن',
        description: 'إيجار الشقة الشهري',
        date: rentDate,
        createdAt: new Date(rentDate).getTime(),
        accountId: acc1,
        account: accNames[acc1],
        isDemo: 1,
        necessity: 'need',
        mood: 'neutral'
      });

      // Freelance Income (every 2 months)
      if (m % 2 === 0) {
        const freelanceDate = d(m, 15);
        txs.push({
          id: `tx_inc_freelance_${m}`,
          amount: 1500 + (Math.floor(Math.random() * 2500)),
          type: 'income',
          category: 'عمل حر',
          description: descriptions['عمل حر'][Math.floor(Math.random() * descriptions['عمل حر'].length)],
          date: freelanceDate,
          createdAt: new Date(freelanceDate).getTime(),
          accountId: acc1,
          account: accNames[acc1],
          isDemo: 1,
          necessity: 'want',
          isFavorite: Math.random() > 0.5,
          mood: 'happy'
        });
      }

      // Investment payouts (every 2 months)
      if (m % 2 === 1) {
        const investIncDate = d(m, 22);
        txs.push({
          id: `tx_inc_invest_${m}`,
          amount: 400 + (Math.floor(Math.random() * 800)),
          type: 'income',
          category: 'استثمار',
          description: descriptions['استثمار'][Math.floor(Math.random() * descriptions['استثمار'].length)],
          date: investIncDate,
          createdAt: new Date(investIncDate).getTime(),
          accountId: acc3,
          account: accNames[acc3],
          isDemo: 1,
          necessity: 'need',
          mood: 'happy'
        });
      }

      // 35 Regular Expenses per month to create a giant database (total ~420 transactions)
      for (let i = 0; i < 35; i++) {
        const cat = categories_exp[Math.floor(Math.random() * categories_exp.length)];
        const descList = descriptions[cat] || ['مصروف عام'];
        const desc = descList[Math.floor(Math.random() * descList.length)];
        const day = Math.floor(Math.random() * 28) + 1;
        const txDate = d(m, day);
        const aId = (Math.random() > 0.8) ? acc2 : (Math.random() > 0.6 ? acc4 : acc1);
        const necessity = ['مواد غذائية', 'مواصلات', 'سكن', 'صحة', 'تعليم', 'فواتير'].includes(cat) ? 'need' : 'want';
        
        // Proper emotional spending analysis support keys
        const moodKeys = ['happy', 'sad', 'stressed', 'tired', 'neutral'];
        const mood = necessity === 'want' ? moodKeys[Math.floor(Math.random() * moodKeys.length)] : 'neutral';
        
        // 15% favorites
        const isFavorite = Math.random() < 0.15;

        txs.push({
          id: `tx_auto_${m}_${i}`,
          amount: Math.floor(Math.random() * 450) + 15,
          type: 'expense',
          category: cat,
          description: desc,
          date: txDate,
          createdAt: new Date(txDate).getTime(),
          accountId: aId,
          account: accNames[aId],
          isDemo: 1,
          necessity,
          mood,
          isFavorite
        });
      }
    }

    // ── 2a. Completed Weeks of 52-Week Saving Challenge ─────────────────
    for (let w = 1; w <= 20; w++) {
      const weekDate = d(0, Math.max(1, 28 - (20 - w)));
      txs.push({
        id: `tx_week52_save_${w}`,
        amount: w * 10,
        type: 'income',
        category: 'استثمار',
        description: `تحدي الـ 52 أسبوعاً - الأسبوع ${w} 🪙`,
        date: weekDate,
        createdAt: new Date(weekDate).getTime(),
        accountId: acc1,
        account: accNames[acc1],
        isDemo: 1,
        necessity: 'need',
        mood: 'happy'
      });
    }

    // ── 2b. SPLIT & SHARED FAMILY TRANSACTIONS ──────────────────────────
    // Shared transactions (family_shared / split by members)
    txs.push({
      id: 'tx_shared_family_1',
      amount: 450,
      type: 'expense',
      category: 'family_shared',
      description: 'عشاء عائلي فاخر بمناسبة الترقية',
      date: d(0, 15),
      createdAt: new Date(d(0, 15)).getTime(),
      accountId: acc1,
      account: accNames[acc1],
      isDemo: 1,
      necessity: 'want',
      mood: 'happy',
      shared: true,
      splitBy: 3,
      includedMembers: ['أميرة', 'ماجد']
    });

    txs.push({
      id: 'tx_shared_family_2',
      amount: 180,
      type: 'expense',
      category: 'family_shared',
      description: 'مقاضي طارئة للبيت والمطبخ',
      date: d(1, 10),
      createdAt: new Date(d(1, 10)).getTime(),
      accountId: acc1,
      account: accNames[acc1],
      isDemo: 1,
      necessity: 'need',
      mood: 'neutral',
      shared: true,
      splitBy: 2,
      includedMembers: ['أميرة']
    });

    txs.push({
      id: 'tx_shared_family_3',
      amount: 600,
      type: 'expense',
      category: 'family_shared',
      description: 'تصليح مكيف الصالة الرئيسي المشترك',
      date: d(2, 5),
      createdAt: new Date(d(2, 5)).getTime(),
      accountId: acc1,
      account: accNames[acc1],
      isDemo: 1,
      necessity: 'need',
      mood: 'neutral',
      shared: true,
      splitBy: 3,
      includedMembers: ['أميرة', 'ماجد']
    });

    txs.push({
      id: 'tx_shared_family_4',
      amount: 350,
      type: 'expense',
      category: 'family_shared',
      description: 'ألعاب وهدايا للأولاد في العيد',
      date: d(3, 22),
      createdAt: new Date(d(3, 22)).getTime(),
      accountId: acc2,
      account: accNames[acc2],
      isDemo: 1,
      necessity: 'want',
      mood: 'happy',
      shared: true,
      splitBy: 2,
      includedMembers: ['أميرة']
    });

    txs.push({
      id: 'tx_shared_family_5',
      amount: 120,
      type: 'expense',
      category: 'family_shared',
      description: 'أدوية علاج وصيدلية للوالد',
      date: d(4, 18),
      createdAt: new Date(d(4, 18)).getTime(),
      accountId: acc1,
      account: accNames[acc1],
      isDemo: 1,
      necessity: 'need',
      mood: 'neutral',
      shared: true,
      splitBy: 3,
      includedMembers: ['أميرة', 'أبو أحمد']
    });

    // General transaction splits
    txs.push({
      id: `tx_split_panda`,
      amount: 1200,
      type: 'expense',
      category: 'أخرى',
      description: 'فاتورة مقاضي بنده الكبرى (مقسمة)',
      date: d(0, 12),
      createdAt: new Date(d(0, 12)).getTime(),
      accountId: acc1,
      account: accNames[acc1],
      isDemo: 1,
      necessity: 'need',
      mood: 'neutral',
      splits: [
        { category: 'مواد غذائية', amount: 850, description: 'مقاضي ولحوم الشهر الأساسية' },
        { category: 'تسوق', amount: 250, description: 'مستلزمات العناية بالمنزل والمنظفات' },
        { category: 'صحة', amount: 100, description: 'فيتامينات ومكملات غذائية' }
      ]
    });

    txs.push({
      id: `tx_split_jarir`,
      amount: 650,
      type: 'expense',
      category: 'أخرى',
      description: 'مشتريات مكتبة جرير (مقسمة)',
      date: d(1, 18),
      createdAt: new Date(d(1, 18)).getTime(),
      accountId: acc4,
      account: accNames[acc4],
      isDemo: 1,
      necessity: 'need',
      mood: 'happy',
      splits: [
        { category: 'تعليم', amount: 450, description: 'كتب ومراجع دراسية للأطفال' },
        { category: 'تسوق', amount: 200, description: 'أدوات مكتبية وقرطاسية' }
      ]
    });

    // ── 2c. DUBAI & LONDON TRIP TRANSACTIONS ──────────────────────────
    // Dubai trip
    txs.push({
      id: 'tx_trip_hotel',
      amount: 3570,
      type: 'expense',
      category: 'سكن',
      description: 'فندق روف دبي مارينا (3500 درهم)',
      date: d(0, 11),
      createdAt: new Date(d(0, 11)).getTime(),
      accountId: acc4,
      account: accNames[acc4],
      tripId: 'trip_dubai',
      necessity: 'want',
      mood: 'happy',
      isDemo: 1
    });

    txs.push({
      id: 'tx_trip_meals',
      amount: 612,
      type: 'expense',
      category: 'مطاعم',
      description: 'وجبات عائلية في دبي مول (600 درهم)',
      date: d(0, 12),
      createdAt: new Date(d(0, 12)).getTime(),
      accountId: acc2,
      account: accNames[acc2],
      tripId: 'trip_dubai',
      necessity: 'want',
      mood: 'happy',
      isDemo: 1
    });

    txs.push({
      id: 'tx_trip_sim',
      amount: 153,
      type: 'expense',
      category: 'فواتير',
      description: 'شريحة اتصال سياحية اتصالات (150 درهم)',
      date: d(0, 10),
      createdAt: new Date(d(0, 10)).getTime(),
      accountId: acc1,
      account: accNames[acc1],
      tripId: 'trip_dubai',
      necessity: 'need',
      mood: 'neutral',
      isDemo: 1
    });

    txs.push({
      id: 'tx_trip_dubai_shopping',
      amount: 816,
      type: 'expense',
      category: 'تسوق',
      description: 'دبي مول للتسوق والملابس (800 درهم)',
      date: d(0, 13),
      createdAt: new Date(d(0, 13)).getTime(),
      accountId: acc4,
      account: accNames[acc4],
      tripId: 'trip_dubai',
      necessity: 'want',
      mood: 'happy',
      isDemo: 1
    });

    txs.push({
      id: 'tx_trip_dubai_burj',
      amount: 306,
      type: 'expense',
      category: 'ترفيه',
      description: 'تذاكر قمة برج خليفة والنافورة (300 درهم)',
      date: d(0, 12),
      createdAt: new Date(d(0, 12)).getTime(),
      accountId: acc4,
      account: accNames[acc4],
      tripId: 'trip_dubai',
      necessity: 'want',
      mood: 'happy',
      isDemo: 1
    });

    txs.push({
      id: 'tx_trip_dubai_taxi',
      amount: 204,
      type: 'expense',
      category: 'مواصلات',
      description: 'تاكسي دبي ومترو التنقل (200 درهم)',
      date: d(0, 14),
      createdAt: new Date(d(0, 14)).getTime(),
      accountId: acc2,
      account: accNames[acc2],
      tripId: 'trip_dubai',
      necessity: 'need',
      mood: 'neutral',
      isDemo: 1
    });

    // London trip
    txs.push({
      id: 'tx_trip_london_flight',
      amount: 2850,
      type: 'expense',
      category: 'سفر',
      description: 'تذاكر طيران الخطوط السعودية لندن (600 جنيه استرليني)',
      date: d(3, 4),
      createdAt: new Date(d(3, 4)).getTime(),
      accountId: acc1,
      account: accNames[acc1],
      tripId: 'trip_london',
      necessity: 'need',
      mood: 'happy',
      isDemo: 1
    });

    txs.push({
      id: 'tx_trip_london_hotel',
      amount: 3800,
      type: 'expense',
      category: 'سكن',
      description: 'فندق هيلتون لندن بادينغتون (800 جنيه استرليني)',
      date: d(3, 5),
      createdAt: new Date(d(3, 5)).getTime(),
      accountId: acc4,
      account: accNames[acc4],
      tripId: 'trip_london',
      necessity: 'need',
      mood: 'happy',
      isDemo: 1
    });

    txs.push({
      id: 'tx_trip_london_dinner',
      amount: 475,
      type: 'expense',
      category: 'مطاعم',
      description: 'عشاء عمل بمطعم عربي بلندن (100 جنيه استرليني)',
      date: d(3, 8),
      createdAt: new Date(d(3, 8)).getTime(),
      accountId: acc2,
      account: accNames[acc2],
      tripId: 'trip_london',
      necessity: 'want',
      mood: 'happy',
      isDemo: 1
    });

    txs.push({
      id: 'tx_trip_london_metro',
      amount: 142.5,
      type: 'expense',
      category: 'مواصلات',
      description: 'بطاقة أويستر لمترو لندن (30 جنيه استرليني)',
      date: d(3, 10),
      createdAt: new Date(d(3, 10)).getTime(),
      accountId: acc2,
      account: accNames[acc2],
      tripId: 'trip_london',
      necessity: 'need',
      mood: 'neutral',
      isDemo: 1
    });

    // ── 2d. COOLING PERIOD TRANSACTIONS ────────────────────────────────
    txs.push({
      id: 'tx_cooling_active',
      amount: 2400,
      type: 'expense',
      category: 'تسوق',
      description: 'نظارة واقع افتراضي Meta Quest 3',
      date: new Date().toISOString().slice(0, 10),
      createdAt: Date.now(),
      accountId: acc4,
      account: accNames[acc4],
      necessity: 'want',
      mood: 'stressed',
      isDraft: true,
      coolingExpireDate: new Date(Date.now() + 36 * 3600 * 1000).toISOString(),
      notes: 'رغبة لحظية بعد مشاهدة مراجعة تقنية. تم تعليق الشراء للتأمل وتجنب الإنفاق العاطفي.',
      isDemo: 1
    });

    txs.push({
      id: 'tx_cooling_expired',
      amount: 1250,
      type: 'expense',
      category: 'ترفيه',
      description: 'اشتراك سنوي في منتجع صحي ونادي رياضي فاخر',
      date: new Date(Date.now() - 48 * 3600 * 1000).toISOString().slice(0, 10),
      createdAt: Date.now() - 48 * 3600 * 1000,
      accountId: acc1,
      account: accNames[acc1],
      necessity: 'want',
      mood: 'tired',
      isDraft: true,
      coolingExpireDate: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
      notes: 'مرت 48 ساعة من التبريد والتحقق من الميزانية للتأكد من جدوى الاشتراك المالي والصحي.',
      isDemo: 1
    });

    await db.transactions.bulkPut(txs);

    // ── 3. BUDGETS ───────────────────────────────────────────────────────
    await db.budgets.bulkPut([
      { id: 'bud1', category: 'مواد غذائية', limit: 2500, name: 'ميزانية الأكل والشرب', period: 'monthly', isDemo: 1 },
      { id: 'bud2', category: 'مواصلات',     limit: 1500, name: 'بنزين ومشاوير',    period: 'monthly', isDemo: 1 },
      { id: 'bud3', category: 'ترفيه',       limit: 1000, name: 'ترفيه وطلعات',     period: 'monthly', isDemo: 1 },
      { id: 'bud4', category: 'تسوق',        limit: 3000, name: 'ملابس وإلكترونيات',  period: 'monthly', isDemo: 1 },
    ]);

    // ── 4. GOALS ─────────────────────────────────────────────────────────
    await db.goals.bulkPut([
      { id: 'goal1', name: 'شراء سيارة 2026',    target: 120000, saved: 45000, icon: '🚗', color: '#f43f5e', targetDate: d(-18, 1), isDemo: 1 },
      { id: 'goal2', name: 'رحلة اليابان العائلية', target: 25000,  saved: 12500, icon: '✈️',         color: '#0ea5e9', targetDate: d(-6, 1), isDemo: 1 },
      { id: 'goal3', name: 'دفعة أولى لمنزل',     target: 250000, saved: 85000, icon: '🏠',           color: '#8b5cf6', targetDate: d(-36, 1), isDemo: 1 },
    ]);

    // ── 5. BILLS & SUBSCRIPTIONS & RECURRING ─────────────────────────────
    await db.bills.bulkPut([
      { id: 'bill1', name: 'فاتورة الكهرباء (سكيكو)', amount: 650,  dueDate: d(0, 25), type: 'bill', isPaid: false, icon: '⚡', isDemo: 1 },
      { id: 'bill2', name: 'اشتراك الألياف البصرية', amount: 350,  dueDate: d(0, 10), type: 'bill', isPaid: true,  icon: '🌐', isDemo: 1 },
      { id: 'bill3', name: 'فاتورة المياه الوطنية', amount: 120, dueDate: d(0, 28), type: 'bill', isPaid: false, icon: '💧', isDemo: 1 },
      { id: 'bill4', name: 'فاتورة الجوال STC المفوترة', amount: 250, dueDate: d(0, 18), type: 'bill', isPaid: true, icon: '📱', isDemo: 1 },
      { id: 'bill5', name: 'قسط السيارة للأهلي',           amount: 1850, dueDate: d(0, 3),  type: 'bill', isPaid: true,  icon: '💸', isDemo: 1 },
      { id: 'bill6', name: 'فاتورة الغاز المركزي', amount: 80, dueDate: d(0, 12), type: 'bill', isPaid: true, icon: '🔥', isDemo: 1 },
      { id: 'bill7', name: 'قسط تمويل البنك العربي', amount: 1500, dueDate: d(0, 27), type: 'bill', isPaid: false, icon: '🏦', isDemo: 1 },
      { id: 'bill8', name: 'صيانة السيارة السنوية', amount: 1200, dueDate: d(0, 15), type: 'bill', isPaid: true, icon: '🔧', isDemo: 1 }
    ]);

    await db.subscriptions.bulkPut([
      { id: 'sub1', name: 'Netflix Premium',      amount: 65,   nextBillingDate: d(0, 15), category: 'ترفيه', icon: '📺', isDemo: 1 },
      { id: 'sub2', name: 'YouTube Premium',      amount: 29,   nextBillingDate: d(0, 20), category: 'ترفيه', icon: '▶️', isDemo: 1 },
      { id: 'sub3', name: 'Spotify Family',       amount: 35,   nextBillingDate: d(0, 5),  category: 'ترفيه', icon: '🎵', isDemo: 1 },
      { id: 'sub4', name: 'ChatGPT Plus',         amount: 75,   nextBillingDate: d(0, 22), category: 'تعليم', icon: '🧠', isDemo: 1 },
      { id: 'sub5', name: 'iCloud+ 2TB',          amount: 37,   nextBillingDate: d(0, 18), category: 'فواتير', icon: '☁️', isDemo: 1 },
      { id: 'sub6', name: 'Amazon Prime SA',      amount: 16,   nextBillingDate: d(0, 10), category: 'تسوق', icon: '📦', isDemo: 1 }
    ]);

    await db.recurringTransactions.bulkPut([
      {
        id: 'rec_internet',
        type: 'expense',
        category: 'فواتير',
        amount: 250,
        frequency: 'monthly',
        nextDate: d(0, 10).slice(0, 10),
        description: 'اشتراك إنترنت فايبر مكرر',
        accountId: acc1,
        account: accNames[acc1],
        isActive: true,
        autoConfirm: true,
        isDemo: 1
      },
      {
        id: 'rec_gym',
        type: 'expense',
        category: 'ترفيه',
        amount: 300,
        frequency: 'monthly',
        nextDate: d(0, 5).slice(0, 10),
        description: 'اشتراك فتنس تايم مكرر',
        accountId: acc4,
        account: accNames[acc4],
        isActive: true,
        autoConfirm: false,
        isDemo: 1
      },
      {
        id: 'rec_kids_allowance',
        type: 'expense',
        category: 'أخرى',
        amount: 150,
        frequency: 'weekly',
        nextDate: d(0, 2).slice(0, 10),
        description: 'مصروف الأولاد الأسبوعي',
        accountId: acc1,
        account: accNames[acc1],
        isActive: true,
        autoConfirm: true,
        isDemo: 1
      },
      {
        id: 'rec_insurance',
        type: 'expense',
        category: 'مواصلات',
        amount: 1800,
        frequency: 'yearly',
        nextDate: d(0, 45).slice(0, 10),
        description: 'تأمين سيارة التعاونية سنوي',
        accountId: acc1,
        account: accNames[acc1],
        isActive: true,
        autoConfirm: false,
        isDemo: 1
      },
      {
        id: 'rec_charity',
        type: 'expense',
        category: 'هدايا',
        amount: 100,
        frequency: 'monthly',
        nextDate: d(0, 25).slice(0, 10),
        description: 'تبرع شهري لمنصة إحسان مكرر',
        accountId: acc1,
        account: accNames[acc1],
        isActive: true,
        autoConfirm: true,
        isDemo: 1
      }
    ]);

    // ── 6. DEBTS & FINANCING LOANS (الديون والقروض التمويلية كبرى) ──────
    await db.debts.bulkPut([
      { id: 'debt1', name: 'سلفة خالد عبد الله', person: 'خالد', total: 3500, paid: 1500, type: 'lent', notes: 'إصلاح سيارته', icon: '👤', isDemo: 1 },
      { id: 'debt2', name: 'تمويل البنك العربي', person: 'البنك', total: 50000, paid: 35000, type: 'owed', notes: 'قرض شخصي لإعادة تأثيث المنزل', icon: '🏦', isDemo: 1 },
      { id: 'debt_home', name: 'التمويل العقاري السكني (الراجحي)', person: 'مصرف الراجحي', total: 650000, paid: 120000, type: 'owed', notes: 'تمويل عقاري لشراء الشقة السكنية الأساسية بفائدة تنافسية', icon: 'home', isDemo: 1 },
      { id: 'debt_car', name: 'تمويل سيارة العائلة (الأهلي)', person: 'البنك الأهلي', total: 85000, paid: 45000, type: 'owed', notes: 'تمويل تأجيري منتهي بالتمليك للسيارة العائلية', icon: 'directions_car', isDemo: 1 },
      { id: 'debt_personal_long', name: 'تمويل شخصي طويل الأجل (البلاد)', person: 'بنك البلاد', total: 150000, paid: 90000, type: 'owed', notes: 'تمويل شخصي طويل الأجل لصيانة العقارات والمشاريع الاستثمارية', icon: 'payments', isDemo: 1 }
    ]);

    // ── 7. INVESTMENTS ───────────────────────────────────────────────────
    await db.investments.bulkPut([
      { id: 'inv1', name: 'محفظة الأسهم السعودية',  type: 'stocks', cost: 85000, value: 94200, icon: '📈', isDemo: 1 },
      { id: 'inv2', name: 'صندوق الذهب (ETF)',     type: 'gold',   cost: 20000, value: 21500, icon: '🪙', isDemo: 1 },
      { id: 'inv3', name: 'محفظة صكوك الراجحي الاستثمارية', type: 'bonds', cost: 40000, value: 41800, icon: '📜', isDemo: 1 },
      { id: 'inv4', name: 'عملات رقمية (بيتكوين وإيثريوم)', type: 'crypto', cost: 15000, value: 18500, icon: '🪙', isDemo: 1 }
    ]);

    // ── 8. INSTALLMENTS (الأقساط المجدولة) ───────────────────────────────────
    await db.installments.bulkPut([
      { id: 'inst_iphone', name: 'قسط آيفون 16 برو', amount: 280, totalPayments: 24, paidPayments: 8, dueDate: d(0, 25), person: 'مكتبة جرير', accountId: acc1, notes: 'تقسيط بدون فوائد عن طريق تمويل جرير', isDemo: 1 },
      { id: 'inst_sofa', name: 'قسط طقم كنب غرفة المعيشة', amount: 420, totalPayments: 12, paidPayments: 4, dueDate: d(1, 1), person: 'ايكيا الرياض', accountId: acc4, notes: 'تقسيط بطاقة الائتمان صفر فوائد', isDemo: 1 }
    ]);

    // ── 9. ASSETS (الأصول والممتلكات) ─────────────────────────────────────────
    await db.assets.bulkPut([
      {
        id: 'asset_apt_jeddah',
        name: 'شقة سكنية - حي الياسمين بجدة',
        category: 'real_estate',
        purchasePrice: 950000,
        purchaseDate: new Date(Date.now() - 3.5 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        lifespanYears: 30,
        salvageValue: 150000,
        warrantyExpiry: new Date(Date.now() + 6.5 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        depreciationMethod: 'straight_line',
        notes: 'شقة استثمارية مؤجرة بعقد سنوي',
        isDemo: 1
      },
      {
        id: 'asset_tesla_y',
        name: 'سيارة تسلا موديل Y (2023)',
        category: 'vehicle',
        purchasePrice: 215000,
        purchaseDate: new Date(Date.now() - 1.5 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        lifespanYears: 10,
        salvageValue: 35000,
        warrantyExpiry: new Date(Date.now() + 2.5 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        depreciationMethod: 'double_declining',
        notes: 'السيارة الكهربائية العائلية الرئيسية',
        isDemo: 1
      },
      {
        id: 'asset_macbook_pro',
        name: 'جهاز ماكبوك برو 16 بوصة M3 Max',
        category: 'electronics',
        purchasePrice: 15999,
        purchaseDate: new Date(Date.now() - 0.5 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        lifespanYears: 5,
        salvageValue: 1500,
        warrantyExpiry: new Date(Date.now() + 1.5 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        depreciationMethod: 'straight_line',
        notes: 'جهاز العمل والبرمجة الشخصي الفاخر',
        isDemo: 1
      },
      {
        id: 'asset_furniture',
        name: 'أثاث ومفروشات الصالة والمجالس',
        category: 'other',
        purchasePrice: 45000,
        purchaseDate: '2022-03-15',
        lifespanYears: 8,
        salvageValue: 5000,
        depreciationMethod: 'straight_line',
        notes: 'أثاث الصالة المجدد بالكامل من ايكيا وهوم سنتر',
        isDemo: 1
      },
      {
        id: 'asset_gold_coins',
        name: 'سبائك وعملات ذهب استثمارية',
        category: 'other',
        purchasePrice: 32000,
        purchaseDate: '2024-01-10',
        lifespanYears: 50,
        salvageValue: 32000,
        depreciationMethod: 'straight_line',
        notes: 'عملات ذهبية مخزنة للادخار طويل الأجل',
        isDemo: 1
      }
    ]);

    // ── 10. CHALLENGES (التحديات التفاعلية) ────────────────────────────────────
    await db.challenges.bulkPut([
      { id: 'chal_restaurants', name: 'تحدي 30 يوماً بدون وجبات سريعة 🍔❌', type: 'avoid', duration: 30, progress: 75, startDate: d(0, 1), category: 'مطاعم', target: 1500, saved: 1125, reward: '🥇 وسام الطاهي المنزلي', isDemo: true },
      { id: 'chal_emergency', name: 'تأسيس صندوق الطوارئ 🛡️', type: 'save', duration: 90, progress: 60, startDate: d(0, 10), target: 10000, saved: 6000, reward: '🏆 درع الأمان المالي', isDemo: true },
      { id: 'chal_coffee', name: 'تقليل قهوة الكافيهات الخارجية ☕', type: 'avoid', duration: 15, progress: 100, startDate: d(0, 2), category: 'مطاعم', target: 300, saved: 300, reward: '🎯 وسام صانع القهوة المنزلي', isDemo: true },
      { id: 'chal_shopping', name: 'تقييد شراء الملابس الزائدة 🛍️❌', type: 'avoid', duration: 30, progress: 40, startDate: d(0, 5), category: 'تسوق', target: 1000, saved: 400, reward: '👕 وسام المشتري الواعي', isDemo: true },
      { id: 'chal_saving_gold', name: 'شراء سبيكة ذهب صغيرة 🪙', type: 'save', duration: 120, progress: 20, startDate: d(0, 15), target: 5000, saved: 1000, reward: '💎 وسام المستثمر الذهبي', isDemo: true },
      { id: 'chal_books', name: 'تحدي قراءة وتطوير مالي 📚', type: 'save', duration: 30, progress: 100, startDate: d(0, 1), target: 150, saved: 150, reward: '🧠 وسام الحكيم المالي', isDemo: true },
      { id: 'chal_bills', name: 'تقنين استخدام الكهرباء والمياه ⚡', type: 'avoid', duration: 30, progress: 90, startDate: d(0, 3), category: 'فواتير', target: 500, saved: 450, reward: '🌿 صديق البيئة والميزانية', isDemo: true },
      { id: 'chal_charity', name: 'التبرع الشهري المنظم 🤝', type: 'save', duration: 30, progress: 100, startDate: d(0, 1), target: 200, saved: 200, reward: '💖 وسام الخير والعطاء', isDemo: true }
    ]);

    // ── 11. TRIPS (ميزانيات السفر المتعدد العملات) ──────────────────────────────
    await db.trips.bulkPut([
      { id: 'trip_dubai', name: 'رحلة دبي العائلية ✈️', currency: 'AED', limit: 6000, exchangeRate: 1.02, startDate: d(0, 10), endDate: d(-1, 15), isActive: true, color: 'from-amber-500 to-orange-600', description: 'رحلة ترفيهية للتسوق وزيارة نافورة دبي وبورج خليفة', isDemo: 1 },
      { id: 'trip_london', name: 'رحلة لندن للعمل 🇬🇧', currency: 'GBP', limit: 1500, exchangeRate: 4.75, startDate: d(-3, 5), endDate: d(-3, 12), isActive: true, color: 'from-blue-500 to-indigo-600', description: 'حضور مؤتمر التقنية المالية السنوي', isDemo: 1 }
    ]);

    // ── 12. NOTIFICATIONS (التنبيهات الإرشادية) ──────────────────────────────────
    await db.notifications.bulkPut([
      { id: 'notif_warn_budget', type: 'warn', icon: 'warning', title: 'اقتراب تجاوز ميزانية التسوق ⚠️', body: 'لقد استهلكت 87% من ميزانية التسوق لهذا الشهر. المتبقي لك هو 390 ر.س فقط.', page: 'budgets', timestamp: Date.now() - 4 * 3600000, read: 0, date: new Date().toISOString() },
      { id: 'notif_success_chal', type: 'success', icon: 'emoji_events', title: 'تهانينا! أكملت تحدي القهوة المنزلية 🎉', body: 'لقد نجحت في توفير 300 ر.س هذا الشهر عبر تجنب الكافيهات وتحضير القهوة منزلياً!', page: 'challenges', timestamp: Date.now() - 24 * 3600000, read: 1, date: new Date(Date.now() - 24 * 3600000).toISOString() },
      { id: 'notif_info_bill', type: 'info', icon: 'schedule', title: 'تذكير: موعد سداد فاتورة الكهرباء', body: 'فاتورة الكهرباء بقيمة 650 ر.س مستحقة في غضون 3 أيام.', page: 'bills', timestamp: Date.now() - 1 * 3600000, read: 0, date: new Date().toISOString() }
    ]);

    // ── 13. LOCAL STORAGE SEEDING (حسابات الأطفال والمغلفات والتحدي 52) ────────────
    try {
      // 52-Week Challenge Completed Weeks
      try {
        localStorage.setItem('masarifi_week52_completed_weeks', JSON.stringify([
          1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
        ]));
      } catch (_) {
        /* localStorage access unavailable — ignore in test/isolated environments */
      }

      // Child Accounts & Digital Envelopes Seeding via Zustand Store (Single Source of Truth)
      const settingsStore = useSettingsStore.getState();
      
      settingsStore.setChildAccounts([
        {
          id: 'child_ahmed',
          name: 'أحمد',
          age: 10,
          allowance: 50,
          period: 'weekly',
          balance: 25,
          transactions: [
            { id: 'ctx_1', description: 'المصروف الأسبوعي', amount: 50, type: 'income', date: new Date().toISOString() },
            { id: 'ctx_2', description: 'شراء قصة مصورة', amount: 15, type: 'expense', date: new Date().toISOString() },
            { id: 'ctx_3', description: 'شراء حلوى وعصير', amount: 10, type: 'expense', date: new Date().toISOString() }
          ]
        },
        {
          id: 'child_sarah',
          name: 'سارة',
          age: 8,
          allowance: 30,
          period: 'weekly',
          balance: 18,
          transactions: [
            { id: 'ctx_4', description: 'المصروف الأسبوعي', amount: 30, type: 'income', date: new Date().toISOString() },
            { id: 'ctx_5', description: 'أقلام تلوين', amount: 12, type: 'expense', date: new Date().toISOString() }
          ]
        },
        {
          id: 'child_fahad',
          name: 'فهد',
          age: 14,
          allowance: 200,
          period: 'monthly',
          balance: 75,
          transactions: [
            { id: 'ctx_6', description: 'المصروف الشهري', amount: 200, type: 'income', date: new Date().toISOString() },
            { id: 'ctx_7', description: 'شحن لعبة روبلوكس', amount: 80, type: 'expense', date: new Date().toISOString() },
            { id: 'ctx_8', description: 'غداء مع الأصدقاء', amount: 45, type: 'expense', date: new Date().toISOString() }
          ]
        }
      ]);

      settingsStore.setEnvelopes([
        { id: 'env_grocery', name: 'مقاضي البقالة الأسبوعية', limit: 500, spent: 420, color: '#059669', icon: 'local_grocery_store' },
        { id: 'env_gas', name: 'بنزين سيارة العائلة', limit: 200, spent: 150, color: '#0ea5e9', icon: 'local_gas_station' },
        { id: 'env_entertainment', name: 'ترفيه نهاية الأسبوع', limit: 350, spent: 310, color: '#d97706', icon: 'sports_esports' },
        { id: 'env_tech', name: 'اشتراكات تقنية', limit: 150, spent: 129, color: '#7c3aed', icon: 'subscriptions' }
      ]);
    } catch (e) {
      recordException('Error seeding state', e as Error);
    }

    await db.setSetting('hasDemoData', true);
    await db.recordAction('import_data', 'Seeded FULL 12-month professional dataset (450+ txs, splits, cooling, travel, installments, assets, challenges, loans, kids, envelopes)');
    
    try {
      const { toast } = await import('../../../toast');
      toast('تم تحميل البيانات التجريبية الشاملة بنجاح! 🚀🔥', 'success');
    } catch (_) {
      /* Toast service may be unmounted or headless — safe fallback */
    }
  },

  async clearDemoData(db: MasarifiDB) {
    let totalDeleted = 0;
    const tablesToClear = db.tables.filter(t => t.name !== 'settings' && t.name !== 'auditLog' && t.name !== 'notifications');
    
    for (const table of tablesToClear) {
      try {
        const deletedCount = await table.where('isDemo').equals(1).delete();
        totalDeleted += deletedCount;
      } catch (e) {
        // Table might not have isDemo index yet or other issue, fallback to manual filter
        const all = await table.toArray();
        const demoIds = all.filter((x: { isDemo?: number | boolean; id: string }) => x.isDemo === 1 || x.isDemo === true).map(x => x.id);
        if (demoIds.length > 0) {
          await table.bulkDelete(demoIds);
          totalDeleted += demoIds.length;
        }
      }
    }

    try {
      localStorage.removeItem('masarifi_week52_completed_weeks');
      const settingsStore = useSettingsStore.getState();
      settingsStore.setChildAccounts([]);
      settingsStore.setEnvelopes([]);
    } catch (_) {
      /* State or storage cleanup error — safe ignore */
    }

    await db.setSetting('hasDemoData', false);
    await db.recordAction('wipe_data', `Cleared ${totalDeleted} demo items`);
    return totalDeleted;
  }
};
