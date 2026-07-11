import { Buffer } from "node:buffer";

const owner = process.env.GITHUB_OWNER;
const repo = process.env.GITHUB_REPO;
const branch = process.env.GITHUB_BRANCH || "main";
const githubToken = process.env.GITHUB_TOKEN;
const adminPassword = process.env.ADMIN_PASSWORD;

const json = (data, status = 200) => {
    return new Response(JSON.stringify(data), {
        status,
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
        },
    });
};

const validarVariables = () => {
    const faltantes = [];

    if (!owner) faltantes.push("GITHUB_OWNER");
    if (!repo) faltantes.push("GITHUB_REPO");
    if (!branch) faltantes.push("GITHUB_BRANCH");
    if (!githubToken) faltantes.push("GITHUB_TOKEN");
    if (!adminPassword) faltantes.push("ADMIN_PASSWORD");

    return faltantes;
};

const crearHeadersGithub = () => {
    return {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };
};

const validarPassword = (request) => {
    const password = request.headers.get("x-admin-password");
    return password && password === adminPassword;
};

const obtenerArchivo = async (path) => {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`;

    const respuesta = await fetch(url, {
        method: "GET",
        headers: crearHeadersGithub(),
    });

    if (!respuesta.ok) {
        const errorTexto = await respuesta.text();

        throw new Error(
            `No se pudo leer ${path}. GitHub respondio: ${respuesta.status} ${errorTexto}`
        );
    }

    const data = await respuesta.json();
    const contenido = Buffer.from(data.content, "base64").toString("utf8");

    return {
        sha: data.sha,
        content: contenido,
    };
};

const guardarArchivoTexto = async (path, content, message) => {
    let sha = null;

    try {
        const archivoActual = await obtenerArchivo(path);
        sha = archivoActual.sha;
    } catch {
        sha = null;
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    const body = {
        message,
        content: Buffer.from(content, "utf8").toString("base64"),
        branch,
    };

    if (sha) {
        body.sha = sha;
    }

    const respuesta = await fetch(url, {
        method: "PUT",
        headers: crearHeadersGithub(),
        body: JSON.stringify(body),
    });

    if (!respuesta.ok) {
        const errorTexto = await respuesta.text();

        throw new Error(
            `No se pudo guardar ${path}. GitHub respondio: ${respuesta.status} ${errorTexto}`
        );
    }

    return respuesta.json();
};

const guardarArchivoBase64 = async (path, contentBase64, message) => {
    let sha = null;

    try {
        const archivoActual = await obtenerArchivo(path);
        sha = archivoActual.sha;
    } catch {
        sha = null;
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    const body = {
        message,
        content: contentBase64,
        branch,
    };

    if (sha) {
        body.sha = sha;
    }

    const respuesta = await fetch(url, {
        method: "PUT",
        headers: crearHeadersGithub(),
        body: JSON.stringify(body),
    });

    if (!respuesta.ok) {
        const errorTexto = await respuesta.text();

        throw new Error(
            `No se pudo subir ${path}. GitHub respondio: ${respuesta.status} ${errorTexto}`
        );
    }

    return respuesta.json();
};

const manejarGet = async () => {
    const configFile = await obtenerArchivo("src/data/config.json");
    const slidesFile = await obtenerArchivo("src/data/slides.json");

    return json({
        ok: true,
        config: JSON.parse(configFile.content),
        slides: JSON.parse(slidesFile.content),
    });
};

const manejarPost = async (request) => {
    const body = await request.json();

    const config = body.config;
    const slides = body.slides;
    const mediaFiles = body.mediaFiles || [];

    if (!config || !slides) {
        return json(
            {
                ok: false,
                message: "Faltan datos para guardar",
            },
            400
        );
    }

    for (const file of mediaFiles) {
        if (!file.path || !file.contentBase64) {
            return json(
                {
                    ok: false,
                    message: "Hay un archivo multimedia incompleto",
                },
                400
            );
        }

        await guardarArchivoBase64(
            file.path,
            file.contentBase64,
            `Subir archivo multimedia ${file.path}`
        );
    }

    await guardarArchivoTexto(
        "src/data/config.json",
        JSON.stringify(config, null, 2),
        "Actualizar configuracion general"
    );

    await guardarArchivoTexto(
        "src/data/slides.json",
        JSON.stringify(slides, null, 2),
        "Actualizar slides desde panel admin"
    );

    return json({
        ok: true,
        message: "Cambios guardados correctamente",
    });
};

export default {
    async fetch(request) {
        try {
            const variablesFaltantes = validarVariables();

            if (variablesFaltantes.length > 0) {
                return json(
                    {
                        ok: false,
                        message: `Faltan variables en Vercel: ${variablesFaltantes.join(", ")}`,
                    },
                    500
                );
            }

            if (!validarPassword(request)) {
                return json(
                    {
                        ok: false,
                        message: "Password incorrecto",
                    },
                    401
                );
            }

            if (request.method === "GET") {
                return await manejarGet();
            }

            if (request.method === "POST") {
                return await manejarPost(request);
            }

            return json(
                {
                    ok: false,
                    message: "Metodo no permitido",
                },
                405
            );
        } catch (error) {
            return json(
                {
                    ok: false,
                    message: error.message || "Error interno",
                },
                500
            );
        }
    },
};