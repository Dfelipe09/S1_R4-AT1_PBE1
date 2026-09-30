import express from "express";
import type { Express, Request, Response } from "express";
import fs from "fs";
import crypto from "crypto";
import { z } from "zod";

const PORT: number = 8081;
const app: Express = express();

// Comando para criar a pasta dados e arquivo JSON
const DIR = "./dados";
const FILE = `${DIR}/produtos.json`;

// Verificação para ver se o arquivo já existe, para não substituí-lo
if (!fs.existsSync(FILE)) {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, "[]", "utf-8");
}

// Middleware para interpretar JSON no corpo da requisição
app.use(express.json());

const createProdutoSchema = z.object({
    nomeProduto: z.string().min(3),
    precoProduto: z.coerce.number().positive(),
});

type Produto = {
    id: string;
    nome: string;
    preco: number;
};

app.post("/produtos", (req: Request, res: Response) => {
    try {
        const { nomeProduto, precoProduto } = createProdutoSchema.parse(req.body);

        // Cria a constante para armazenar os dados e não perdê-los
        const data: string = fs.readFileSync(FILE, "utf-8");
        let produtos: Produto[] = JSON.parse(data);

        // Comando para criar novos produtos
        // randomUUID cria automaticamente os IDs 
        let novoProduto: Produto = {
            id: crypto.randomUUID(),
            nome: nomeProduto,
            preco: precoProduto,
        };

        // Empurra um novo registro para o final da lista
        produtos.push(novoProduto);

        fs.writeFileSync(FILE, JSON.stringify(produtos, null, 4), "utf-8");

        return res.status(201).json({
            message: `Produto ${nomeProduto} - R$ ${precoProduto} foi criado com sucesso!`,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                erro: "Os parâmetros enviados são inválidos!",
                detalhes: error.issues,
            });
        }

        console.error("Erro interno ao cadastrar produto:", error);
        return res.status(500).json({
            erro: "Erro interno no servidor ao cadastrar produto.",
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});