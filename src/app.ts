import { randomUUID } from "crypto";
import express from "express";
import type { Express, Request, Response } from "express";
import fs from "fs";
import { z } from "zod";

const PORT: number = 8081;
const app: Express = express();

const DIR = "./dados";
const FILE = `${DIR}/chamados.json`;

if (!fs.existsSync(FILE)) {
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(FILE, "[]", "utf-8");
}

app.use(express.json());

// Schema do POST
const createChamadoSchema = z.object({
    nomeCliente: z.string().min(3),
    equipamento: z.string().min(2),
    descricaoProblema: z.string().min(6),
    Prioridade: z.enum(["Baixa", "Média", "Alta"]).default("Média"),
    Status: z.enum(["Aberto", "Em Andamento", "Concluído"]).default("Aberto")
});

// Schema do GET
const queryChamadoSchema = z.object({
    nomeCliente: z.string().optional(),
    equipamento: z.string().optional(),
    descricaoProblema: z.string().optional(),
    Status: z.enum(["Aberto", "Em Andamento", "Concluído"]).optional(),
    Prioridade: z.enum(["Baixa", "Média", "Alta"]).optional(),
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().positive().default(10),
    sortBy: z.enum(["Status", "Prioridade"]).default("Status"),
    order: z.enum(["asc", "desc"]).default("asc")
});

type Chamado = z.infer<typeof createChamadoSchema> & { id: string };

// Rota GET de busca por ID
app.get("/chamados/:id", (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const data: string = fs.readFileSync(FILE, "utf-8");
        const chamados: Chamado[] = JSON.parse(data);

        // Busca por ID
        const chamadoEncontrado = chamados.find((chamado) => chamado.id === id);

        if (!chamadoEncontrado) {
            return res.status(404).json({ erro: "Chamado não encontrado!" });
        }

        return res.status(200).json(chamadoEncontrado);

    } catch (error) {
        console.error("Erro ao buscar por ID:", error);
        return res.status(500).json({ erro: "Erro interno ao buscar o chamado." });
    }
});

// Rota GET unificada (Listagem, Filtros, Ordenação e Paginação)
app.get("/chamados", (req: Request, res: Response) => {
    try {
        const query = queryChamadoSchema.parse(req.query);
        const data: string = fs.readFileSync(FILE, "utf-8");
        let chamados: Chamado[] = JSON.parse(data);

        // 1. Aplica filtros de busca (se informados na query)
        if (query.nomeCliente) {
            chamados = chamados.filter(c =>
                c.nomeCliente.toLowerCase().includes(query.nomeCliente!.toLowerCase())
            );
        }
        if (query.equipamento) {
            chamados = chamados.filter(c =>
                c.equipamento.toLowerCase().includes(query.equipamento!.toLowerCase())
            );
        }
        if (query.descricaoProblema) {
            chamados = chamados.filter(c =>
                c.descricaoProblema.toLowerCase().includes(query.descricaoProblema!.toLowerCase())
            );
        }
        if (query.Status) {
            chamados = chamados.filter(c => c.Status === query.Status);
        }
        if (query.Prioridade) {
            chamados = chamados.filter(c => c.Prioridade === query.Prioridade);
        }

        // 2. Aplica ordenação
        chamados.sort((a, b) => {
            const valA = a[query.sortBy];
            const valB = b[query.sortBy];
            const compare = valA.localeCompare(valB);
            return query.order === "desc" ? -compare : compare;
        });

        // 3. Aplica paginação
        const totalRegistros = chamados.length;
        const totalPages = Math.ceil(totalRegistros / query.limit) || 1;

        const inicioSlice = (query.page - 1) * query.limit;
        const finalSlice = query.page * query.limit;
        const chamadosPaginados = chamados.slice(inicioSlice, finalSlice);

        return res.status(200).json({
            total: totalRegistros,
            page: query.page,
            paginas: totalPages,
            data: chamadosPaginados
        });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(400).json({
                erro: "Os parâmetros enviados na URL são inválidos!",
                detalhes: error.issues
            });
        }

        console.error("Erro capturado:", error);
        return res.status(500).json({ erro: "Erro ao processar a requisição!" });
    }
});

// Método POST
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
        return res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
});