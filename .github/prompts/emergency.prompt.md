# Prompt: Protocolo de Emergencia

> **Skill Pack:** Cargar **portal-deploy-guard** (`.claude/skills/portal-deploy-guard/SKILL.md`) + Skill 17 (Emergencia) del SKILL_PACK_V5.0.md
> **Regla:** Restaurar servicio PRIMERO, investigar DESPUÉS

## Clasificación

| Nivel | Definición | Response Time |
|---|---|---|
| SEV-1 | Portal caído o datos corruptos visibles | <15 min |
| SEV-2 | Un dashboard no carga | <1 hora |
| SEV-3 | Funcionalidad degradada | <4 horas |
| SEV-4 | Issue cosmético | Next sprint |

## Protocolo SEV-1 (Portal Caído)

```bash
# MINUTO 0-5: Diagnóstico rápido
pm2 status | grep portal
curl -sI https://portalviceministerioenergia.minenergia.gov.co | head -1
pm2 logs portal-mme --lines 50 --nostream

# MINUTO 5-10: Rollback si es cambio reciente
git log --oneline -5
# Si último commit es de hoy <2h → git revert
git revert HEAD
./scripts/deploy.sh   # NUNCA npm run build sin pm2 restart

# MINUTO 10-15: Verificar y escalar si persiste
curl -s http://localhost:3001/api/health | head -c 300
```

## Comunicación de Emergencia

```markdown
## 🚨 SEV-[N]: [Título]
- Hora inicio: HH:MM
- Síntoma: [qué ve el usuario]
- Impacto: [quién afectado, qué dashboards]
- Acciones tomadas: [lista con timestamps]
- Estado: [INVESTIGANDO / MITIGANDO / RESUELTO / ESCALADO]
- Próximo paso: [qué sigue]
- Necesito: [ayuda humana, acceso, etc.]
```

## Post-Mortem Obligatorio (SEV-1 y SEV-2)

Dentro de 24h del incidente:
```markdown
## Post-Mortem: [Fecha]
- Resumen: [1 párrafo]
- Timeline: [con timestamps exactos]
- Causa raíz (5 Whys): [lista]
- Acciones correctivas: [con DT-XXX asignados]
- Lecciones: [para .knowledge/errors.md]
```
