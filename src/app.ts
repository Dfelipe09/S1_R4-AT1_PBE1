import { randomUUID } from "crypto";
import express from "express";
import type { Express, Request, Response } from "express";
import fs from "fs";
import { z } from "zod";

const PORT: number = 8081;
const app: Express = express();

const DIR = "./dados";
const FILE = `${DIR}/chamados.json`;

// Verificação para ver se o arquivo já existe, para não substituí-lo
if (!fs.existsSync(FILE)) {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, "[]", "utf-8");
}

// Middleware para interpretar JSON no corpo da requisição
app.use(express.json());

const createChamadoSchema = z.object({
    nomeCliente: z.string().min(3),
    equipamento: z.string().min(2),
    descricaoProblema: z.string().min(6),
    Prioridade: z.enum(["Baixa", "Média", "Alta"]).default("Média"),
    Status: z.enum(["Aberto", "Em Andamento", "Concluído"]).default("Aberto")
});

// Define o tipo extraindo do schema do Zod + adicionando a propriedade id
type Chamado = z.infer<typeof createChamadoSchema> & { id: string };

app.post("/chamados", (req: Request, res: Response) => {
    try {
        const dadosValidados = createChamadoSchema.parse(req.body);

        const data: string = fs.readFileSync(FILE, "utf-8");
        const chamados: Chamado[] = JSON.parse(data);

        const novoChamado: Chamado = {
            id: randomUUID(),
            ...dadosValidados
        };

        chamados.push(novoChamado);

        fs.writeFileSync(FILE, JSON.stringify(chamados, null, 4), "utf-8");

        return res.status(201).json({
            message: `O chamado com ID ${novoChamado.id} do(a) cliente${novoChamado.nomeCliente} foi criado com sucesso!`,
            chamado: novoChamado
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                erro: "Os parâmetros enviados são inválidos!",
                detalhes: error.issues
            });
        }

        console.error("Erro interno ao cadastrar chamado:", error);
        return res.status(500).json({
            erro: "Erro interno no servidor ao cadastrar chamado."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});