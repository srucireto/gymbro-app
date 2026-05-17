# Lógica de programación semanal · Futsal + Gym

## Reglas inamovibles

Estas reglas no se negocian. Son la base de cualquier orden semanal:

| Regla | Buffer mínimo | Justificación |
|---|---|---|
| Pull A → partido | **96hs** | RDL + curl sentado generan DOMS alto en isquios. Tirón de isquios = lesión más común en futsal |
| Push A → partido | **48hs** | Hack squat + leg extension generan DOMS en cuádriceps pero menos crítico que cadena posterior |
| Pull B → partido | **24hs** | Ya está recortado (piernas livianas), pero igual necesita margen mínimo |
| Partido → Push B | Post-partido | Push B es la sesión de recuperación activa con cuádriceps controlado. Siempre va después |
| Pull A → Push A | **1 día libre entre ellos** | Ambos tienen trabajo de piernas. No van consecutivos |
| Entreno futsal | Piernas frescas | Tratarlo como partido de baja intensidad. No hacer Pull A el mismo día antes |

---

## Variables fijas de la semana

- **Martes = entreno de futsal**, siempre
- **Excepción**: si el partido cae martes, el entreno se mueve al viernes
- **Partido = 1 por semana**, nunca 2
- **Aviso de cambio de día**: el viernes anterior (2–3 días de anticipación)

---

## Los 7 escenarios por día de partido

### Partido el viernes (semana normal)

```
Lun        Mar           Mié       Jue       Vie         Sáb      Dom
Pull A   | Futsal ent. | Push A | Pull B | PARTIDO  | Push B | Descanso
```
- 4 sesiones de gym ✓
- Todos los buffers respetados ✓
- Sin ajustes necesarios

---

### Partido el lunes

```
Lun        Mar           Mié       Jue       Vie        Sáb      Dom
PARTIDO  | Futsal ent. | Push B | Descanso | Pull A | Push A | Descanso
```
- Pull B pasa a la semana siguiente (lunes siguiente antes del próximo partido)
- **3 sesiones de gym esa semana** (Pull A, Push A, Push B — Pull B queda fuera)
- Pull A el viernes tiene 96hs+ hasta el próximo partido (viernes siguiente) ✓

---

### Partido el martes (entreno pasa al viernes)

```
Lun       Mar        Mié       Jue       Vie          Sáb      Dom
Pull A* | PARTIDO | Push A | Descanso | Futsal ent. | Push B | Descanso
```
- Pull A* esta semana = **versión liviana** (mismo que Pull B normalmente)
  - Razón: solo 24hs entre Pull A y el partido del martes. No alcanza para Pull A pesado
  - El Pull A pesado real se hizo el lunes de la semana anterior, el ciclo no se rompe
- Pull B desaparece esta semana — no hay ventana segura para meterlo
- **3 sesiones de gym esa semana**

---

### Partido el miércoles

```
Lun       Mar           Mié        Jue       Vie       Sáb      Dom
Pull A  | Futsal ent. | PARTIDO | Descanso | Push A | Pull B | Push B
```
- Push A pasa al viernes (48hs post-partido, piernas recuperadas) ✓
- Pull B sábado, Push B domingo
- **4 sesiones de gym** ✓
- Escenario más fácil de resolver

---

### Partido el jueves

```
Lun       Mar           Mié       Jue        Vie       Sáb      Dom
Pull A  | Futsal ent. | Push A | PARTIDO | Descanso | Push B | Pull B
```
- Push B sábado (post-partido) ✓
- Pull B domingo con piernas livianas ✓
- **4 sesiones de gym** ✓

---

### Partido el sábado

```
Lun        Mar           Mié       Jue       Vie       Sáb        Dom
Descanso | Futsal ent. | Pull A | Push A | Pull B | PARTIDO | Push B
```
- Pull A miércoles: 72hs antes del partido ✓ (límite inferior, aceptable)
- Push A jueves: 48hs ✓
- Pull B viernes: 24hs, versión liviana ✓
- Push B domingo post-partido ✓
- **4 sesiones de gym** ✓

---

### Partido el domingo

```
Lun        Mar           Mié       Jue       Vie       Sáb        Dom
Descanso | Futsal ent. | Pull A | Push A | Pull B | Descanso | PARTIDO
```
- Pull A miércoles: 96hs ✓
- Push B pasa al lunes siguiente
- **3 sesiones de gym esa semana**

---

## Resumen ejecutivo

| Día del partido | Sesiones gym | Ajuste necesario |
|---|---|---|
| Lunes | 3 | Pull B pasa a semana siguiente |
| Martes | 3 | Pull A se hace versión liviana. Pull B desaparece esa semana |
| Miércoles | 4 | Push A, Pull B y Push B se corren hacia adelante |
| Jueves | 4 | Push B y Pull B se corren al fin de semana |
| Viernes | 4 | Semana normal, sin cambios |
| Sábado | 4 | Semana empieza con descanso el lunes |
| Domingo | 3 | Push B pasa al lunes siguiente |

---

## Regla general para cualquier escenario no previsto

Si en el futuro hay un caso no cubierto, aplicar este orden de prioridad:

1. Ubicar el partido en el calendario
2. Colocar Pull A exactamente 96hs antes (o más)
3. Colocar Push A exactamente 48hs antes (o más)
4. Colocar Pull B exactamente 24hs antes (o más), versión liviana
5. Colocar Push B el día siguiente al partido (o más tarde)
6. Respetar que el martes es siempre futsal (o viernes si el partido cae martes)
7. Si no entran las 4 sesiones: sacrificar Pull B primero, luego Push B

---

## Pull A versión liviana (para cuando cae martes)

Cuando el partido cae martes y solo hay 24hs de buffer, Pull A se hace con la siguiente modificación:

- **Espalda completa**: sin cambios (dominadas, chest-supported row, jalón, pullover, face pull)
- **Isquios**: curl sentado a RIR 2–3 (no al fallo), 3 series en lugar de 4
- **Glúteo**: sin RDL, sin hip thrust pesado. Solo hip thrust liviano opcional
- **Bíceps**: curl predicador normal (no afecta el partido)

Esta versión es idéntica en lógica al Pull B habitual.
