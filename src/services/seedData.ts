import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  writeBatch 
} from 'firebase/firestore';
import { db, auth } from './firebase/config';
import { handleFirestoreError, OperationType } from './firebase/errors';
import { 
  Room, 
  Child, 
  Family, 
  UserProfile, 
  AttendanceRecord, 
  Activity, 
  ProgressReport, 
  Announcement,
  AuditLog
} from '../types';

export const INITIAL_ROOMS: Room[] = [
  {
    id: 'room-cuna',
    name: 'Sala Cuna (Lactantes)',
    description: 'Espacio cálido y seguro para bebés de 45 días a 12 meses con suelo acolchado y climatización.',
    ageRange: '45 días a 1 año',
    capacity: 8,
    color: '#76987E',
    assignedTeacherIds: ['teacher-carla'],
    status: 'active',
    schedule: '08:00 - 17:00 hs',
    createdAt: new Date().toISOString()
  },
  {
    id: 'room-1ano',
    name: 'Sala Deambuladores',
    description: 'Área diseñada para primeros pasos, gateo activo y exploración sensorial guiada.',
    ageRange: '12 a 24 meses',
    capacity: 12,
    color: '#0284C7',
    assignedTeacherIds: ['teacher-carla', 'teacher-lucia'],
    status: 'active',
    schedule: '08:00 - 17:00 hs',
    createdAt: new Date().toISOString()
  },
  {
    id: 'room-2anos',
    name: 'Sala 2 Años (Exploradores)',
    description: 'Desarrollo de lenguaje, juego simbólico, hábitos de autonomía e interacción grupal.',
    ageRange: '2 a 3 años',
    capacity: 15,
    color: '#D97706',
    assignedTeacherIds: ['teacher-lucia'],
    status: 'active',
    schedule: '08:00 - 17:00 hs',
    createdAt: new Date().toISOString()
  },
  {
    id: 'room-3anos',
    name: 'Sala 3 Años (Creativos)',
    description: 'Iniciación a proyectos expresivos, psicomotricidad fina y preparación preescolar.',
    ageRange: '3 a 4 años',
    capacity: 16,
    color: '#8B5CF6',
    assignedTeacherIds: ['teacher-lucia'],
    status: 'active',
    schedule: '08:00 - 17:00 hs',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_CHILDREN: Child[] = [
  {
    id: 'child-mateo',
    firstName: 'Mateo',
    lastName: 'Rossi',
    birthDate: '2025-11-14',
    roomId: 'room-cuna',
    roomName: 'Sala Cuna (Lactantes)',
    enrollmentStatus: 'active',
    enrollmentDate: '2026-03-01',
    authorizedParentIds: ['parent-laura'],
    familyId: 'family-rossi',
    allergies: 'Ninguna conocida',
    dietaryNotes: 'Lactancia materna diferida + inicio de papillas de calabaza y manzana',
    medicalNotes: 'Control pediátrico al día. Vacunas del calendario completas.',
    emergencyContact: 'Laura Rossi (Madre) - +54 9 11 4522-9901',
    administrativeNotes: 'Autorizada tía paterna Mariana Rossi para retiros con DNI.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'child-sofia',
    firstName: 'Sofía',
    lastName: 'Gómez',
    birthDate: '2025-05-18',
    roomId: 'room-1ano',
    roomName: 'Sala Deambuladores',
    enrollmentStatus: 'active',
    enrollmentDate: '2026-02-15',
    authorizedParentIds: ['parent-martin'],
    familyId: 'family-gomez',
    allergies: 'Intolerancia leve a la lactosa (leche deslactosada)',
    dietaryNotes: 'Colaciones de frutas frescas cortadas en trocitos seguros',
    medicalNotes: 'Presenta dermatitis atópica en pliegues en días de mucho calor',
    emergencyContact: 'Martín Gómez (Padre) - +54 9 11 5566-7788',
    administrativeNotes: 'Seguro médico OSDE 310.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'child-lucas',
    firstName: 'Lucas',
    lastName: 'Benítez',
    birthDate: '2024-08-20',
    roomId: 'room-2anos',
    roomName: 'Sala 2 Años (Exploradores)',
    enrollmentStatus: 'active',
    enrollmentDate: '2026-03-05',
    authorizedParentIds: ['parent-carolina'],
    familyId: 'family-benitez',
    allergies: 'Ninguna',
    dietaryNotes: 'Alimentación variada sin restricciones',
    emergencyContact: 'Carolina Benítez (Madre) - +54 9 11 3344-5566',
    administrativeNotes: 'Proceso de control de esfínteres iniciado en acuerdo con la familia.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'child-emma',
    firstName: 'Emma',
    lastName: 'Fernández',
    birthDate: '2023-10-10',
    roomId: 'room-3anos',
    roomName: 'Sala 3 Años (Creativos)',
    enrollmentStatus: 'active',
    enrollmentDate: '2026-02-01',
    authorizedParentIds: ['parent-diego'],
    familyId: 'family-fernandez',
    allergies: 'Alérgica a picadura de abejas (protocolo de botiquín)',
    dietaryNotes: 'Menú general del jardín',
    emergencyContact: 'Diego Fernández (Padre) - +54 9 11 2233-4455',
    administrativeNotes: 'Asiste en turno tarde completo.',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_FAMILIES: Family[] = [
  {
    id: 'family-rossi',
    familyName: 'Familia Rossi',
    primaryGuardianName: 'Laura Rossi',
    primaryGuardianEmail: 'laura.rossi@ejemplo.com',
    primaryGuardianPhone: '+54 9 11 4522-9901',
    secondaryGuardianName: 'Javier Rossi',
    secondaryGuardianPhone: '+54 9 11 4522-9902',
    guardianUserIds: ['parent-laura'],
    childIds: ['child-mateo'],
    address: 'Av. Libertador 4500, CABA',
    emergencyContactName: 'Mariana Rossi (Tía)',
    emergencyContactPhone: '+54 9 11 8877-6655',
    status: 'active',
    notes: 'Familia muy comprometida con las actividades institucionales.',
    createdAt: new Date().toISOString()
  },
  {
    id: 'family-gomez',
    familyName: 'Familia Gómez',
    primaryGuardianName: 'Martín Gómez',
    primaryGuardianEmail: 'martin.gomez@ejemplo.com',
    primaryGuardianPhone: '+54 9 11 5566-7788',
    guardianUserIds: ['parent-martin'],
    childIds: ['child-sofia'],
    address: 'Calle Güemes 1200, CABA',
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'family-benitez',
    familyName: 'Familia Benítez',
    primaryGuardianName: 'Carolina Benítez',
    primaryGuardianEmail: 'carolina.benitez@ejemplo.com',
    primaryGuardianPhone: '+54 9 11 3344-5566',
    guardianUserIds: ['parent-carolina'],
    childIds: ['child-lucas'],
    status: 'active',
    createdAt: new Date().toISOString()
  },
  {
    id: 'family-fernandez',
    familyName: 'Familia Fernández',
    primaryGuardianName: 'Diego Fernández',
    primaryGuardianEmail: 'diego.fernandez@ejemplo.com',
    primaryGuardianPhone: '+54 9 11 2233-4455',
    guardianUserIds: ['parent-diego'],
    childIds: ['child-emma'],
    status: 'active',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'admin-director',
    email: 'gianpasquinelli19@gmail.com',
    displayName: 'Dirección Pedagógica (Gian)',
    role: 'admin',
    isActive: true,
    phone: '+54 9 11 4000-0001',
    createdAt: new Date().toISOString()
  },
  {
    id: 'teacher-carla',
    email: 'carla.mendez@guarderia.com',
    displayName: 'Profa. Carla Méndez',
    role: 'teacher',
    isActive: true,
    phone: '+54 9 11 4000-0002',
    assignedRoomIds: ['room-cuna', 'room-1ano'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'teacher-lucia',
    email: 'lucia.suarez@guarderia.com',
    displayName: 'Profa. Lucía Suárez',
    role: 'teacher',
    isActive: true,
    phone: '+54 9 11 4000-0003',
    assignedRoomIds: ['room-2anos', 'room-3anos'],
    createdAt: new Date().toISOString()
  },
  {
    id: 'parent-laura',
    email: 'laura.rossi@ejemplo.com',
    displayName: 'Laura Rossi (Mamá de Mateo)',
    role: 'parent',
    isActive: true,
    phone: '+54 9 11 4522-9901',
    familyId: 'family-rossi',
    linkedChildIds: ['child-mateo'],
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act-01',
    title: 'Estimulación visual y rincón de texturas',
    description: 'Sesión sobre colchoneta con móviles contrastantes, texturas suaves de terciopelo y sonajeros de madera. Mateo interactuó activamente estirando sus bracitos.',
    category: 'activity',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    roomId: 'room-cuna',
    roomName: 'Sala Cuna (Lactantes)',
    childIds: ['child-mateo'],
    authorUserId: 'teacher-carla',
    authorName: 'Profa. Carla Méndez',
    createdAt: new Date().toISOString()
  },
  {
    id: 'act-02',
    title: 'Colación de media mañana',
    description: 'Toma de mamadera con leche materna enviada por la familia (120ml) con excelente succión y posterior eructo confortable.',
    category: 'meal',
    date: new Date().toISOString().split('T')[0],
    time: '11:15',
    roomId: 'room-cuna',
    roomName: 'Sala Cuna (Lactantes)',
    childIds: ['child-mateo'],
    authorUserId: 'teacher-carla',
    authorName: 'Profa. Carla Méndez',
    createdAt: new Date().toISOString()
  },
  {
    id: 'act-03',
    title: 'Descanso de mediodía',
    description: 'Siesta profunda de 1 hora y 15 minutos en cuna individual con música clásica instrumental y temperatura de confort a 22°C.',
    category: 'nap',
    date: new Date().toISOString().split('T')[0],
    time: '12:30',
    roomId: 'room-cuna',
    roomName: 'Sala Cuna (Lactantes)',
    childIds: ['child-mateo'],
    authorUserId: 'teacher-carla',
    authorName: 'Profa. Carla Méndez',
    createdAt: new Date().toISOString()
  },
  {
    id: 'act-04',
    title: 'Juego de construcción y encastre',
    description: 'Actividad grupal para favorecer la pinza digital y la coordinación óculo-manual en la mesa baja.',
    category: 'activity',
    date: new Date().toISOString().split('T')[0],
    time: '14:20',
    roomId: 'room-1ano',
    roomName: 'Sala Deambuladores',
    childIds: ['child-sofia'],
    authorUserId: 'teacher-carla',
    authorName: 'Profa. Carla Méndez',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_PROGRESS_REPORTS: ProgressReport[] = [
  {
    id: 'rep-01',
    childId: 'child-mateo',
    childName: 'Mateo Rossi',
    roomId: 'room-cuna',
    period: 'Trimestre Actual',
    area: 'cognitive',
    title: 'Curiosidad lúdica y comprensión de causa-efecto',
    observation: 'Mateo demuestra gran persistencia e interés al interactuar con juguetes encastrables y sonajeros. Observa con atención cómo caen los bloques y repite la acción sonriendo al descubrir que su gesto genera el sonido. Se concentra en actividades exploratorias por períodos cada vez más prolongados.',
    strengths: 'Alta capacidad de atención focalizada y curiosidad activa ante nuevos estímulos didácticos.',
    recommendations: 'Proponer en casa juegos de anticipación y esconder objetos para que los descubra.',
    authorUserId: 'teacher-carla',
    authorName: 'Profa. Carla Méndez',
    createdAt: new Date().toISOString()
  },
  {
    id: 'rep-02',
    childId: 'child-mateo',
    childName: 'Mateo Rossi',
    roomId: 'room-cuna',
    period: 'Trimestre Actual',
    area: 'behavior_habits',
    title: 'Adaptación a las rutinas de la sala y convivencia serena',
    observation: 'Muestra una actitud colaborativa y tranquila en las transiciones diarias (del juego a la colación y el descanso). Se calma rápidamente ante las canciones de cuna y responde con agrado a la presencia y voz de sus compañeritos en la alfombra.',
    strengths: 'Comportamiento armonioso, seguro y de fácil integración con sus pares de sala.',
    recommendations: 'Mantener en el hogar rutinas predecibles con música suave antes de dormir.',
    authorUserId: 'teacher-carla',
    authorName: 'Profa. Carla Méndez',
    createdAt: new Date().toISOString()
  },
  {
    id: 'rep-03',
    childId: 'child-mateo',
    childName: 'Mateo Rossi',
    roomId: 'room-cuna',
    period: 'Trimestre Actual',
    area: 'language',
    title: 'Intención comunicativa, balbuceos e interacción vocal',
    observation: 'Responde a su nombre de inmediato girándose y buscando contacto visual. Emite balbuceos con diversas entonaciones para expresar agrado o solicitar un juguete, estableciendo un verdadero diálogo con las docentes.',
    strengths: 'Expresividad afectiva clara y deseo constante de comunicación.',
    recommendations: 'Conversarle mirándolo a los ojos, nombrándole cada elemento de su entorno.',
    authorUserId: 'teacher-carla',
    authorName: 'Profa. Carla Méndez',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [
  {
    id: 'ann-01',
    title: 'Protocolo de primavera y renovación de mudas de ropa',
    content: 'Estimadas familias: solicitamos enviar en la mochila una muda liviana de recambio acorde al clima templado, gorrito para el patio techado y protector solar infantil con receta pediátrica indicada.',
    importance: 'important',
    targetAudience: 'all',
    authorUserId: 'admin-director',
    authorName: 'Dirección Pedagógica',
    publishDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  },
  {
    id: 'ann-02',
    title: 'Reunión Pedagógica Trimestral de Sala Cuna y 1 Año',
    content: 'Los invitamos a nuestro encuentro de intercambio pedagógico el próximo jueves a las 18:00 hs de manera virtual o presencial para compartir las observaciones evolutivas de los pequeños.',
    importance: 'normal',
    targetAudience: 'parents',
    roomId: 'room-cuna',
    roomName: 'Sala Cuna (Lactantes)',
    authorUserId: 'teacher-carla',
    authorName: 'Profa. Carla Méndez',
    publishDate: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_ATTENDANCE: AttendanceRecord[] = [
  {
    id: 'att-mateo-today',
    childId: 'child-mateo',
    childName: 'Mateo Rossi',
    roomId: 'room-cuna',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    checkInTime: '08:15',
    notes: 'Ingresa de buen ánimo en brazos de su mamá.',
    recordedByUserId: 'teacher-carla',
    recordedByName: 'Profa. Carla Méndez',
    createdAt: new Date().toISOString()
  },
  {
    id: 'att-sofia-today',
    childId: 'child-sofia',
    childName: 'Sofía Gómez',
    roomId: 'room-1ano',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    checkInTime: '08:30',
    notes: 'Sin novedades.',
    recordedByUserId: 'teacher-carla',
    recordedByName: 'Profa. Carla Méndez',
    createdAt: new Date().toISOString()
  },
  {
    id: 'att-lucas-today',
    childId: 'child-lucas',
    childName: 'Lucas Benítez',
    roomId: 'room-2anos',
    date: new Date().toISOString().split('T')[0],
    status: 'present',
    checkInTime: '08:45',
    notes: 'Desayunó en casa.',
    recordedByUserId: 'teacher-lucia',
    recordedByName: 'Profa. Lucía Suárez',
    createdAt: new Date().toISOString()
  },
  {
    id: 'att-emma-today',
    childId: 'child-emma',
    childName: 'Emma Fernández',
    roomId: 'room-3anos',
    date: new Date().toISOString().split('T')[0],
    status: 'justified',
    notes: 'Aviso de la familia: control médico de rutina con oftalmólogo.',
    recordedByUserId: 'teacher-lucia',
    recordedByName: 'Profa. Lucía Suárez',
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-01',
    action: 'INICIALIZACION_PLATAFORMA',
    entityType: 'SISTEMA',
    entityId: 'global',
    performedByUserId: 'admin-director',
    performedByUserEmail: 'gianpasquinelli19@gmail.com',
    details: 'Configuración inicial del sistema, definición de salas, usuarios y políticas de seguridad.',
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString()
  }
];

export const INITIAL_FEES = [
  {
    id: 'fee-mateo-oct',
    childId: 'child-mateo',
    childName: 'Mateo Rossi',
    familyId: 'family-rossi',
    concept: 'Cuota Octubre 2026 - Sala Cuna',
    amount: 52000,
    dueDate: '2026-10-10',
    period: '2026-10',
    status: 'pending',
    notes: 'Jornada completa con servicio de comedor incluido',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'fee-sofia-oct',
    childId: 'child-sofia',
    childName: 'Sofía Gómez',
    familyId: 'family-gomez',
    concept: 'Cuota Octubre 2026 - Deambuladores',
    amount: 48000,
    dueDate: '2026-10-10',
    period: '2026-10',
    status: 'in_review',
    paymentMethod: 'transfer',
    paymentId: 'transf-sample-01',
    notes: 'Comprobante de transferencia bancaria enviado, pendiente de revisión administrativa',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'fee-lucas-oct',
    childId: 'child-lucas',
    childName: 'Lucas Benítez',
    familyId: 'family-benitez',
    concept: 'Cuota Octubre 2026 - Sala 2 Años',
    amount: 48000,
    dueDate: '2026-10-10',
    period: '2026-10',
    status: 'paid',
    paidAt: new Date().toISOString(),
    paymentMethod: 'mercadopago',
    paymentId: 'mp-8849201948',
    notes: 'Abonado exitosamente mediante Mercado Pago',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'fee-emma-oct',
    childId: 'child-emma',
    childName: 'Emma Fernández',
    familyId: 'family-fernandez',
    concept: 'Cuota Octubre 2026 - Sala 3 Años',
    amount: 45000,
    dueDate: '2026-10-10',
    period: '2026-10',
    status: 'pending',
    notes: 'Turno mañana',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

// Helper to seed database if empty
export async function seedInitialDatabaseIfEmpty(): Promise<boolean> {
  // If no user is authenticated, skip Firestore seed to prevent permission denial
  if (!auth?.currentUser) {
    return false;
  }

  try {
    const roomsSnap = await getDocs(collection(db, 'rooms'));
    if (!roomsSnap.empty) {
      console.log('Database already initialized with rooms.');
      return false;
    }

    console.log('Seeding initial nursery database...');
    const batch = writeBatch(db);

    // Seed rooms
    for (const room of INITIAL_ROOMS) {
      batch.set(doc(db, 'rooms', room.id), room);
    }
    // Seed children
    for (const child of INITIAL_CHILDREN) {
      batch.set(doc(db, 'children', child.id), child);
    }
    // Seed families
    for (const family of INITIAL_FAMILIES) {
      batch.set(doc(db, 'families', family.id), family);
    }
    // Seed users
    for (const user of INITIAL_USERS) {
      batch.set(doc(db, 'users', user.id), user);
    }
    // Seed activities
    for (const act of INITIAL_ACTIVITIES) {
      batch.set(doc(db, 'activities', act.id), act);
    }
    // Seed progress reports
    for (const rep of INITIAL_PROGRESS_REPORTS) {
      batch.set(doc(db, 'progressReports', rep.id), rep);
    }
    // Seed announcements
    for (const ann of INITIAL_ANNOUNCEMENTS) {
      batch.set(doc(db, 'announcements', ann.id), ann);
    }
    // Seed attendance
    for (const att of INITIAL_ATTENDANCE) {
      batch.set(doc(db, 'attendance', att.id), att);
    }
    // Seed audit logs
    for (const log of INITIAL_AUDIT_LOGS) {
      batch.set(doc(db, 'auditLogs', log.id), log);
    }

    // Seed initial fees
    for (const fee of INITIAL_FEES) {
      batch.set(doc(db, 'fees', fee.id), fee);
    }

    // Seed enrollment codes
    const sampleCodes = [
      { id: 'code-mateo', code: 'NIDO-MATEO-2026', childId: 'child-mateo', childName: 'Mateo Rossi', roomId: 'room-cuna', familyId: 'family-rossi' },
      { id: 'code-sofia', code: 'NIDO-SOFIA-2026', childId: 'child-sofia', childName: 'Sofía Gómez', roomId: 'room-1ano', familyId: 'family-gomez' },
      { id: 'code-lucas', code: 'NIDO-LUCAS-2026', childId: 'child-lucas', childName: 'Lucas Benítez', roomId: 'room-2anos', familyId: 'family-benitez' },
      { id: 'code-emma', code: 'NIDO-EMMA-2026', childId: 'child-emma', childName: 'Emma Fernández', roomId: 'room-3anos', familyId: 'family-fernandez' }
    ];
    for (const c of sampleCodes) {
      batch.set(doc(db, 'enrollmentCodes', c.id), {
        ...c,
        isClaimed: false,
        claimedByUserIds: [],
        createdAt: new Date().toISOString()
      });
    }

    await batch.commit();
    console.log('Database seeded successfully!');
    return true;
  } catch (error) {
    console.warn('Initial seed skipped or not permitted:', error);
    return false;
  }
}
