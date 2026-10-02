# Especificación de Seguridad de Firestore (Security Spec)
Plataforma Privada de Gestión para Guardería Infantil

## 1. Invariantes de Datos y Control de Acceso (RBAC / ABAC)
1. **Separación Estricta de Roles**:
   - `admin`: Acceso total para administrar usuarios, salas, familias, niños, cámaras, asistencias, actividades y auditoría.
   - `teacher`: Puede consultar niños en sus salas asignadas, registrar asistencias, crear y actualizar actividades y reportes pedagógicos de su sala. No puede modificar usuarios ni configuraciones globales.
   - `parent`: Puede leer únicamente la información de los niños vinculados a su cuenta familiar (`authorizedParentIds` o `familyId`), historial de asistencia de sus hijos, actividades de su sala/hijo, novedades generales, y acceder únicamente a las cámaras autorizadas correspondientes a la sala de sus hijos durante el horario permitido.
2. **Protección de Menores (PII y Privacidad)**:
   - Los datos sensibles, notas médicas y familiares nunca son accesibles por usuarios no autenticados o padres de otras familias.
   - Las fotografías y reportes pedagógicos quedan protegidos.
3. **Inmutabilidad y Auditoría**:
   - Los registros de `auditLogs` son de sólo creación por administradores/servidor y nunca pueden ser modificados ni borrados.
   - El historial de asistencia registra el usuario que realizó el registro.

## 2. The Dirty Dozen Payloads (12 Payloads de Prueba de Vulnerabilidad)
1. **Ataque de Escalada de Rol**: Un usuario con rol `parent` intenta actualizar su propio documento `/users/{userId}` para ponerse `role: 'admin'`. (Esperado: REJECT)
2. **Acceso Cruzado a Expediente Infantil**: El padre de la Familia A intenta leer o listar `/children/{childId}` perteneciente a la Familia B. (Esperado: REJECT)
3. **Escritura No Autorizada de Asistencia**: Un padre intenta crear o alterar un registro en `/attendance/{attendanceId}`. (Esperado: REJECT)
4. **Manipulación de Cámara por Fuera de Horario o Sala**: Un padre intenta consultar la configuración de streaming de una cámara fuera de su sala autorizada o modificar la configuración de `/cameras/{id}`. (Esperado: REJECT)
5. **Borrado No Autorizado de Reporte Pedagógico**: Un padre intenta eliminar un informe de `/progressReports/{id}`. (Esperado: REJECT)
6. **Inyección de ID de Longitud Excesiva (Denial of Wallet)**: Intento de crear un documento con un ID de 2048 caracteres aleatorios. (Esperado: REJECT)
7. **Modificación de Registro de Auditoría**: Cualquier usuario intenta hacer `update` o `delete` sobre `/auditLogs/{logId}`. (Esperado: REJECT)
8. **Publicación de Novedad Institucional por un Padre**: Un padre intenta insertar un documento en `/announcements`. (Esperado: REJECT)
9. **Alteración de Docente en Sala Ajena**: Un docente asignado a la Sala Cuna intenta modificar o borrar actividades de la Sala 2 Años sin asignación. (Esperado: REJECT)
10. **Lectura Pública no Autenticada**: Un visitante anónimo intenta listar `/children`, `/users`, `/cameras` o `/attendance`. (Esperado: REJECT)
11. **Alteración de Invariante Temporal (Spoof de Fechas)**: Crear una actividad con fecha futura imposible o alterar el campo inmutable `createdAt`. (Esperado: REJECT)
12. **Inyección de Campos Fantasma (Ghost Field / Shadow Update)**: Enviar campos no declarados como `isSuperUser: true` al actualizar un registro de niño o docente. (Esperado: REJECT)

## 3. Plan de Verificación de Reglas
Las reglas `firestore.rules` validan:
- Default deny en la raíz `match /{document=**} { allow read, write: if false; }`
- Validación de rol mediante comprobación de documento de usuario o bootstrapped admin `gianpasquinelli19@gmail.com`.
- Comprobación de integridad de esquemas, tamaños máximos de strings e IDs.
- Validaciones relacionales donde los padres solo leen sus propios hijos o salas correspondientes.
