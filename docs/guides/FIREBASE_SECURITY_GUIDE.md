# Guia de Segurança Firebase - Tellstones

## 📋 Resumo das Proteções Implementadas

### ✅ Proteções Ativas

1. **Salas (`/salas`)**
   - ✅ Leitura apenas com código exato (6 caracteres alfanuméricos)
   - ✅ Validação rigorosa de todos os campos
   - ✅ Limite de 4 jogadores e 20 espectadores por sala
   - ✅ Nomes limitados a 50 caracteres
   - ✅ Bloqueio de campos desconhecidos
   - ✅ Timestamps validados (não podem ser no futuro)

2. **Salas Públicas (`/publicRooms`)**
   - ✅ Leitura pública (necessário para listar salas)
   - ✅ Apenas criador pode atualizar sua sala
   - ✅ Auto-expiração (salas com +24h são rejeitadas)
   - ✅ Validação de código (exatamente 6 caracteres)
   - ✅ Limites de jogadores (1-4)
   - ✅ Status validado (waiting/playing/finished)
   - ✅ Bloqueio de campos extras

3. **Bloqueio Geral**
   - ✅ Qualquer outro caminho do banco é completamente bloqueado
   - ✅ Sem acesso a dados de outras áreas

### ⚠️ Limitações (Modo Guest Ativo)

Como o jogo suporta **modo Guest** (sem login obrigatório), algumas limitações se aplicam:

1. **Não há autenticação forte**
   - Qualquer pessoa pode criar salas
   - Qualquer pessoa que saiba o código pode entrar

2. **Segurança por Obscuridade**
   - Códigos aleatórios de 6 caracteres dificultam (mas não impedem) acesso não autorizado
   - Espaço de ~2 bilhões de combinações (36^6)

3. **Possíveis Ataques**
   - ❌ Força bruta (tentar adivinhar códigos)
   - ❌ Spam de criação de salas
   - ❌ Criação de salas públicas falsas

### 🔒 Melhorias para Segurança Máxima

Se você quiser **segurança total**, implemente estas mudanças:

#### Opção 1: Autenticação Obrigatória

```json
{
  "rules": {
    "salas": {
      "$salaId": {
        ".read": "auth != null && (root.child('salas/' + $salaId + '/jogadores/' + auth.uid).exists() || root.child('salas/' + $salaId + '/criador').val() == auth.uid)",
        ".write": "auth != null && (!data.exists() || root.child('salas/' + $salaId + '/criador').val() == auth.uid)"
      }
    }
  }
}
```

**Impacto:** Remove o modo Guest. Todos devem fazer login.

#### Opção 2: Rate Limiting no Cliente

Adicione ao código do jogo:
```javascript
// Limitar criação de salas por IP/usuário
const ultimaCriacao = localStorage.getItem('ultima_sala_criada');
if (ultimaCriacao && Date.now() - parseInt(ultimaCriacao) < 60000) {
  alert('Aguarde 1 minuto entre criações de sala');
  return;
}
localStorage.setItem('ultima_sala_criada', Date.now());
```

#### Opção 3: Firebase Security + Cloud Functions

Use Firebase Cloud Functions para:
- Validar IPs
- Detectar padrões de spam
- Auto-limpar salas antigas
- Monitorar anomalias

## 📖 Como Aplicar as Regras

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Vá em **Realtime Database** > **Regras**
3. Cole o conteúdo de `firebase-rules-secure.json`
4. Clique em **Publicar**

## 🧪 Como Testar

Após aplicar as regras:

1. ✅ Criar sala pública → Deve funcionar
2. ✅ Entrar em sala com código → Deve funcionar
3. ❌ Ler `/salas` diretamente → Deve ser negado
4. ❌ Criar sala com campos inválidos → Deve ser negado
5. ✅ Listar salas públicas → Deve funcionar

## 📊 Comparação: Antes vs Depois

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Leitura de salas | ✅ Pública | 🔒 Apenas com código exato |
| Campos validados | ⚠️ Parcial | ✅ 100% validados |
| Limite de jogadores | ❌ Nenhum | ✅ 4 jogadores, 20 espectadores |
| Salas públicas antigas | ❌ Ficam para sempre | ✅ Auto-expiração 24h |
| Proteção contra spam | ❌ Nenhuma | ⚠️ Validações básicas |
| Autenticação | ❌ Não exigida | ⚠️ Opcional (guest mode ativo) |

## 🚨 Avisos Importantes

1. **Backup**: Antes de aplicar, faça backup das regras atuais
2. **Teste**: Teste em ambiente de desenvolvimento primeiro
3. **Monitore**: Verifique logs do Firebase por tentativas de acesso negado
4. **Evolua**: Considere remover guest mode para segurança máxima

## 💡 Recomendação Final

Para **desenvolvimento**: Use as regras fornecidas (`firebase-rules-secure.json`)
Para **produção**: Implemente autenticação obrigatória + Cloud Functions

---

**Última atualização:** 2026-02-03
**Versão das Regras:** 2.0 (Secure)
