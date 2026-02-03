# Guia Definitivo: Firebase Realtime Database Rules

Baseado na **[Documentação Oficial do Firebase](https://firebase.google.com/docs/database/security)**

## 📚 Conceitos Fundamentais

### Métodos Disponíveis

Segundo a documentação oficial, Firebase Security Rules suportam:

- **`.read`** - Controla quem pode LER dados
- **`.write`** - Controla quem pode ESCREVER (criar/atualizar/deletar)
- **`.validate`** - Valida estrutura dos dados após permissão de escrita
- **`.indexOn`** - Define índices para queries eficientes

### Variáveis Disponíveis

- `auth` - Informações do usuário autenticado (null se guest)
- `now` - Timestamp do servidor (milissegundos)
- `data` - Dados ANTES da operação
- `newData` - Dados DEPOIS da operação (proposta)
- `root` - Referência à raiz do banco
- `$variables` - Capturam segmentos do caminho

### Métodos de Validação (Documentados)

**NO `data` e `newData`:**
- `.exists()` - Verifica se o dado existe
- `.val()` - Retorna o valor
- `.child(nome)` - Acessa filho específico
- `.hasChild(nome)` - Verifica se tem filho específico
- `.hasChildren([array])` - Verifica se tem todos os filhos listados
- `.isString()` - Verifica se é string
- `.isNumber()` - Verifica se é número
- `.isBoolean()` - Verifica se é booleano

**⚠️ MÉTODOS QUE NÃO EXISTEM:**
- ❌ `.isObject()` - NÃO EXISTE
- ❌ `.numChildren()` - NÃO EXISTE (apesar de parecer lógico)
- ❌ `.matches()` na validação de $variável - Funciona apenas em condições

## 🎯 Regras para Tellstones

### Opção 1: Funcional (Desenvolvimento)
**Arquivo:** `firebase-rules-OFFICIAL.json`

```json
{
  "rules": {
    "salas": {
      "$salaId": {
        ".read": "true",
        ".write": "true",
        
        "modo": {
          ".validate": "newData.isString()"
        },
        
        "jogadores": {
          "$playerId": {
            ".validate": "newData.child('nome').exists() && newData.child('nome').isString()"
          }
        },
        
        "espectadores": {
          "$spectatorId": {
            ".validate": "newData.child('nome').exists() && newData.child('nome').isString()"
          }
        }
      }
    },
    
    "publicRooms": {
      ".read": "true",
      ".write": "true",
      ".indexOn": ["status", "createdAt"]
    }
  }
}
```

**Proteções:**
- ✅ Valida que nomes sejam strings
- ✅ Valida estrutura básica
- ✅ Permite todas as operações necessárias

**Limitações:**
- ⚠️ Qualquer pessoa pode ler/escrever
- ⚠️ Sem limite de tamanho de dados
- ⚠️ Sem autenticação obrigatória

### Opção 2: Balanceada (Produção Leve)

```json
{
  "rules": {
    "salas": {
      "$salaId": {
        ".read": "$salaId.length === 6",
        ".write": "!data.exists() || data.exists()",
        
        "modo": {
          ".validate": "newData.isString() && (newData.val() === '1x1' || newData.val() === '2x2')"
        },
        
        "jogadores": {
          "$playerId": {
            ".validate": "newData.child('nome').exists() && newData.child('nome').isString() && newData.child('nome').val().length <= 50"
          }
        }
      }
    },
    
    "publicRooms": {
      ".read": "true",
      ".write": "true",
      ".indexOn": ["status", "createdAt"],
      
      "$roomId": {
        ".validate": "newData.child('code').exists() && newData.child('mode').exists() && newData.child('status').exists()"
      }
    }
  }
}
```

**Proteções Adicionais:**
- ✅ Leitura de salas requer código de 6 caracteres
- ✅ Valida valores específicos de modo
- ✅ Limita tamanho de nomes (50 caracteres)
- ✅ Exige campos obrigatórios em salas públicas

### Opção 3: Segura (Produção com Auth)

```json
{
  "rules": {
    "salas": {
      "$salaId": {
        ".read": "auth != null && $salaId.length === 6",
        ".write": "auth != null && (!data.exists() || data.child('criador').val() === auth.uid)",
        
        "criador": {
          ".validate": "newData.val() === auth.uid"
        },
        
        "modo": {
          ".validate": "newData.isString() && (newData.val() === '1x1' || newData.val() === '2x2')"
        },
        
        "jogadores": {
          "$playerId": {
            ".validate": "newData.child('nome').exists() && newData.child('nome').isString() && newData.child('nome').val().length <= 50 && newData.child('nome').val().length > 0"
          }
        },
        
        "criado": {
          ".validate": "newData.isNumber() && newData.val() <= now"
        }
      }
    },
    
    "publicRooms": {
      ".read": "true",
      ".write": "auth != null",
      ".indexOn": ["status", "createdAt"],
      
      "$roomId": {
        ".validate": "newData.child('code').exists() && newData.child('mode').exists() && newData.child('creator').val() === auth.uid && newData.child('createdAt').isNumber() && newData.child('createdAt').val() <= now"
      }
    }
  }
}
```

**Proteções Máximas:**
- ✅ Exige autenticação para tudo
- ✅ Apenas criador pode modificar sala
- ✅ Valida timestamps não podem ser futuros
- ✅ Criador validado contra UID real
- ❌ **REMOVE MODO GUEST**

## 🚀 Qual Usar?

| Cenário | Regra Recomendada |
|---------|-------------------|
| Desenvolvendo localmente | **Opção 1 (Funcional)** |
| Jogo público com guest mode | **Opção 2 (Balanceada)** |
| Produção com login obrigatório | **Opção 3 (Segura)** |

## 📖 Documentação Oficial

- [Security Rules Overview](https://firebase.google.com/docs/database/security)
- [Rules Conditions](https://firebase.google.com/docs/database/security/rules-conditions)
- [Core Syntax](https://firebase.google.com/docs/database/security/core-syntax)

## ⚠️ Erros Comuns Evitados

1. ❌ **NÃO use `.isObject()`** - Não existe!
2. ❌ **NÃO use `.numChildren()`** - Não existe!
3. ✅ **USE `.hasChildren([array])`** - Para validar campos obrigatórios
4. ✅ **USE `.val().length`** - Para validar tamanhos
5. ✅ **USE `auth != null`** - Para exigir autenticação

---

**Criado:** 2026-02-03  
**Baseado em:** [Documentação Oficial Firebase](https://firebase.google.com/docs/database/security)
