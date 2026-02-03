# Correção de Permissões do Firebase

O erro `PERMISSION_DENIED` está impedindo a criação de salas públicas.

## Solução

1. Acesse o [Firebase Console](https://console.firebase.google.com/).
2. Vá em **Realtime Database** > **Regras**.
3. Use este JSON na aba de Regras:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

4. Clique em **Publicar**.

## Detalhes
Isso define seu banco de dados como "Público" (qualquer um pode ler e escrever).
É útil para desenvolvimento (como agora).
Para produção, você restringiria o acesso mais tarde.
