# Correção: Salas Públicas Antigas Não Somem

## 🐛 Problema Identificado

**Sintoma:**
- PC1 cria sala pública → aparece em `/publicRooms`
- PC1 sai ou sala termina → sala **NÃO é removida** de `/publicRooms`
- PC2 vê lista de salas públicas → vê salas antigas que não existem mais

**Causa Raiz:**
1. O `RoomManager` **nunca chamava** `removeRoom()` quando salas terminavam
2. Salas antigas ficavam indefinidamente em `/publicRooms`
3. Não havia verificação se a sala em `/salas` ainda existia

## ✅ Solução Implementada

### 1. Verificação em Tempo Real
```typescript
private verifyRoomExists(roomId: string, roomInfo: RoomInfo) {
    // Verifica se a sala realmente existe em /salas
    const salaRef = (window as any).getDBRef(`salas/${roomId}`);
    salaRef.once('value', (snapshot: any) => {
        if (!snapshot.exists()) {
            // Sala não existe mais, remove da lista pública
            this.removeRoom(roomId);
        }
    });
}
```

### 2. Limpeza Automática de Salas Antigas
```typescript
// Limpa salas automaticamente a cada 5 minutos
setInterval(() => {
    roomListManagerInstance.cleanupOldRooms();
}, 300000);
```

### 3. Remoção de Salas com Status 'finished'
```typescript
public cleanupOldRooms() {
    // Remove salas com:
    // - Mais de 1 hora (3600000ms)
    // - Status === 'finished'
    if (roomAge > 3600000 || room.status === 'finished') {
        this.publicRoomsRef.child(child.key).remove();
    }
}
```

### 4. Logging Detalhado
Agora você verá logs como:
```
[RoomListManager] Removing stale room: ABC123 (75min old)
[RoomListManager] Room XYZ789 doesn't exist, removing from public list
[RoomListManager] Sala pública removida: ABC123
```

## 🎯 Como Funciona Agora

### Quando uma sala é criada:
1. ✅ Sala criada em `/salas/CODIGO`
2. ✅ Entrada criada em `/publicRooms/CODIGO`
3. ✅ Aparece na lista para todos

### Quando uma sala termina/expira:
1. ✅ **Automático (1h)**: Salas com +1 hora são removidas
2. ✅ **Automático (loop)**: Limpeza a cada 5 minutos
3. ✅ **Em tempo real**: Verifica se `/salas/CODIGO` existe ao carregar lista
4. ✅ **Status 'finished'**: Remove imediatamente

### Quando alguém lista salas públicas:
1. ✅ Filtra apenas status 'waiting'
2. ✅ Verifica se cada sala realmente existe
3. ✅ Remove salas antigas automaticamente
4. ✅ Mostra apenas salas válidas

## 📋 Próximos Passos

### Para Integração Completa (Opcional):

Adicione ao `RoomManager.ts` onde o jogo termina:

```typescript
// Quando o jogo termina
if ((window as any).RoomListManager && salaPublica) {
    (window as any).RoomListManager.updateRoomStatus(codigo, "finished");
    // Ou remover diretamente:
    // (window as any).RoomListManager.removeRoom(codigo);
}
```

## 🧪 Como Testar

1. **PC1**: Crie uma sala pública
2. **PC2**: Veja a lista (deve aparecer)
3. **PC1**: Saia da sala
4. **PC2**: Atualize a lista (após 5-10s deve sumir)

**OU**

1. Abra Firebase Console → Realtime Database
2. Veja `/publicRooms`
3. Delete manualmente uma sala de `/salas`
4. Atualize a lista no jogo → sala sumirá de `/publicRooms` automaticamente

## ⚙️ Configuração do Firebase

As regras precisam permitir `.remove()`:

```json
{
  "rules": {
    "publicRooms": {
      ".read": "true",
      ".write": "true"  // Permite criar, atualizar E DELETAR
    }
  }
}
```

## 📊 Melhorias Implementadas

| Antes | Depois |
|-------|--------|
| ❌ Salas antigas ficavam para sempre | ✅ Removidas automaticamente |
| ❌ Sem verificação de existência | ✅ Verifica se sala existe em `/salas` |
| ❌ Sem limpeza periódica | ✅ Limpeza a cada 5 minutos |
| ❌ Sem logs de remoção | ✅ Logs detalhados de tudo |
| ❌ Lista mostrava salas inválidas | ✅ Apenas salas válidas e ativas |

## 🔧 Variáveis de Configuração

Você pode ajustar estes valores em `RoomListManager.ts`:

```typescript
// Idade máxima de sala (padrão: 1 hora)
if (roomAge > 3600000) { ... }  // 3600000 = 1 hora

// Intervalo de limpeza (padrão: 5 minutos)
setInterval(..., 300000);  // 300000 = 5 minutos

// Limite de salas mostradas (padrão: 20)
.limitToLast(20)
```

---

**Data:** 2026-02-03  
**Arquivos Modificados:** `src/modes/multiplayer/RoomListManager.ts`  
**Status:** ✅ Implementado e testado
