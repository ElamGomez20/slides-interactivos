import { useState } from "react";
import "./AdminPanel.css";

const contactosDefault = [
    { id: "cmb_general", nombre: "CMB GENERAL", numero: "573185384697" },
    { id: "escuela_biblica", nombre: "Escuela Biblica", numero: "573176784539" },
    { id: "obra_social", nombre: "Obra Social", numero: "573113252349" },
    { id: "jovenes", nombre: "Jovenes", numero: "573237049379" },
];

const extensionesPermitidas = [".jpg", ".png", ".mp4"];

const limpiarNombreArchivo = (nombre) => {
    return nombre
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9.-]/g, "");
};

const extensionValida = (nombre) => {
    const archivo = nombre.toLowerCase();

    return extensionesPermitidas.some((ext) => archivo.endsWith(ext));
};

function AdminPanel() {
    const [password, setPassword] = useState(sessionStorage.getItem("admin_password") || "");
    const [autenticado, setAutenticado] = useState(false);
    const [config, setConfig] = useState(null);
    const [slidesData, setSlidesData] = useState(null);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [estado, setEstado] = useState("");

    const cargarContenido = async () => {
        setEstado("Cargando contenido...");

        const respuesta = await fetch("/api/content", {
            method: "GET",
            headers: {
                "x-admin-password": password,
            },
        });

        const data = await respuesta.json();

        if (!data.ok) {
            setEstado(data.message || "No se pudo iniciar sesion");
            return;
        }

        const configFinal = {
            titulo_sitio: data.config.titulo_sitio || "CMB EL CERRITO",
            logo: data.config.logo || "/media/logo.png",
            contactos_whatsapp: data.config.contactos_whatsapp || contactosDefault,
        };

        setConfig(configFinal);
        setSlidesData(data.slides);
        setAutenticado(true);
        sessionStorage.setItem("admin_password", password);
        setEstado("Contenido cargado");
    };

    const cerrarSesion = () => {
        sessionStorage.removeItem("admin_password");
        setPassword("");
        setAutenticado(false);
        setConfig(null);
        setSlidesData(null);
    };

    const actualizarConfig = (campo, valor) => {
        setConfig({
            ...config,
            [campo]: valor,
        });
    };

    const actualizarContacto = (index, campo, valor) => {
        const contactos = [...config.contactos_whatsapp];

        contactos[index] = {
            ...contactos[index],
            [campo]: valor,
        };

        setConfig({
            ...config,
            contactos_whatsapp: contactos,
        });
    };

    const actualizarSlide = (index, campo, valor) => {
        const slides = [...slidesData.slides];

        slides[index] = {
            ...slides[index],
            [campo]: valor,
        };

        setSlidesData({
            ...slidesData,
            slides,
        });
    };

    const agregarSlide = () => {
        const slides = slidesData.slides || [];
        const siguienteId = slides.length > 0 ? Math.max(...slides.map((s) => Number(s.id))) + 1 : 1;

        const nuevoSlide = {
            id: siguienteId,
            activo: true,
            tipo: "imagen",
            url_recurso: "/media/slide-nuevo.jpg",
            titulo: "Nuevo slide",
            subtitulo: "Subtitulo del slide",
            descripcion: "Descripcion del contenido.",
            mensaje_whatsapp: "Hola, quiero recibir mas informacion.",
            contacto_whatsapp: "cmb_general",
            etiqueta: "Nuevo",
        };

        setSlidesData({
            ...slidesData,
            slides: [...slides, nuevoSlide],
        });
    };

    const eliminarSlide = (index) => {
        const confirmar = window.confirm("Seguro que quieres eliminar este slide?");

        if (!confirmar) return;

        const slides = slidesData.slides.filter((_, i) => i !== index);

        setSlidesData({
            ...slidesData,
            slides,
        });
    };

    const convertirArchivoABase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => {
                const resultado = reader.result;
                const base64 = resultado.split(",")[1];

                resolve(base64);
            };

            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const cambiarLogo = async (file) => {
        if (!file) return;

        const nombre = limpiarNombreArchivo(file.name);

        if (!nombre.endsWith(".jpg") && !nombre.endsWith(".png")) {
            alert("El logo solo puede ser .jpg o .png");
            return;
        }

        const contentBase64 = await convertirArchivoABase64(file);
        const path = `public/media/${Date.now()}-${nombre}`;
        const publicPath = path.replace("public", "");

        setMediaFiles((actuales) => [
            ...actuales,
            {
                path,
                contentBase64,
            },
        ]);

        actualizarConfig("logo", publicPath);
    };

    const cambiarArchivoSlide = async (index, file) => {
        if (!file) return;

        const nombre = limpiarNombreArchivo(file.name);

        if (!extensionValida(nombre)) {
            alert("Solo se permiten archivos .jpg, .png o .mp4");
            return;
        }

        const contentBase64 = await convertirArchivoABase64(file);
        const path = `public/media/${Date.now()}-${nombre}`;
        const publicPath = path.replace("public", "");

        const tipo = nombre.endsWith(".mp4") ? "video" : "imagen";

        setMediaFiles((actuales) => [
            ...actuales,
            {
                path,
                contentBase64,
            },
        ]);

        actualizarSlide(index, "url_recurso", publicPath);
        actualizarSlide(index, "tipo", tipo);
    };

    const guardarCambios = async () => {
        setEstado("Guardando cambios...");

        const respuesta = await fetch("/api/content", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-admin-password": password,
            },
            body: JSON.stringify({
                config,
                slides: slidesData,
                mediaFiles,
            }),
        });

        const data = await respuesta.json();

        if (!data.ok) {
            setEstado(data.message || "No se pudo guardar");
            return;
        }

        setMediaFiles([]);
        setEstado("Cambios guardados. Espera 1 o 2 minutos mientras Vercel actualiza la pagina.");
    };

    if (!autenticado) {
        return (
            <main className="admin-page">
                <section className="admin-login">
                    <h1>Panel Administrador</h1>
                    <p>Ingresa la contrasena configurada en Vercel.</p>

                    <input
                        type="password"
                        placeholder="Contrasena del administrador"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />

                    <button onClick={cargarContenido}>Entrar</button>

                    {estado && <span className="admin-estado">{estado}</span>}
                </section>
            </main>
        );
    }

    return (
        <main className="admin-page">
            <section className="admin-header">
                <div>
                    <h1>Panel Administrador</h1>
                    <p>Edita la informacion, contactos y archivos multimedia.</p>
                </div>

                <button className="btn-secundario" onClick={cerrarSesion}>
                    Cerrar sesion
                </button>
            </section>

            <section className="admin-card">
                <h2>Configuracion general</h2>

                <label>
                    Titulo del sitio
                    <input
                        value={config.titulo_sitio}
                        onChange={(event) => actualizarConfig("titulo_sitio", event.target.value)}
                    />
                </label>

                <label>
                    Logo de la iglesia
                    <input
                        type="file"
                        accept=".jpg,.png"
                        onChange={(event) => cambiarLogo(event.target.files[0])}
                    />
                </label>

                {config.logo && <p className="ruta-archivo">Logo actual: {config.logo}</p>}
            </section>

            <section className="admin-card">
                <h2>Contactos de WhatsApp</h2>

                {config.contactos_whatsapp.map((contacto, index) => (
                    <div className="contacto-grid" key={contacto.id}>
                        <label>
                            Area
                            <input
                                value={contacto.nombre}
                                onChange={(event) => actualizarContacto(index, "nombre", event.target.value)}
                            />
                        </label>

                        <label>
                            Numero
                            <input
                                value={contacto.numero}
                                onChange={(event) => actualizarContacto(index, "numero", event.target.value)}
                            />
                        </label>
                    </div>
                ))}
            </section>

            <section className="admin-card">
                <div className="admin-card-title">
                    <h2>Diapositivas</h2>
                    <button onClick={agregarSlide}>Agregar slide</button>
                </div>

                {slidesData.slides.map((slide, index) => (
                    <article className="slide-editor" key={slide.id}>
                        <div className="slide-editor-header">
                            <h3>{slide.titulo || "Slide sin titulo"}</h3>

                            <button className="btn-peligro" onClick={() => eliminarSlide(index)}>
                                Eliminar
                            </button>
                        </div>

                        <label className="check-row">
                            <input
                                type="checkbox"
                                checked={slide.activo !== false}
                                onChange={(event) => actualizarSlide(index, "activo", event.target.checked)}
                            />
                            Activo
                        </label>

                        <label>
                            Archivo multimedia
                            <input
                                type="file"
                                accept=".jpg,.png,.mp4"
                                onChange={(event) => cambiarArchivoSlide(index, event.target.files[0])}
                            />
                        </label>

                        <p className="ruta-archivo">Archivo actual: {slide.url_recurso}</p>

                        <label>
                            Titulo
                            <input
                                value={slide.titulo}
                                onChange={(event) => actualizarSlide(index, "titulo", event.target.value)}
                            />
                        </label>

                        <label>
                            Subtitulo
                            <input
                                value={slide.subtitulo}
                                onChange={(event) => actualizarSlide(index, "subtitulo", event.target.value)}
                            />
                        </label>

                        <label>
                            Descripcion
                            <textarea
                                value={slide.descripcion}
                                onChange={(event) => actualizarSlide(index, "descripcion", event.target.value)}
                            />
                        </label>

                        <label>
                            Mensaje de WhatsApp
                            <textarea
                                value={slide.mensaje_whatsapp}
                                onChange={(event) => actualizarSlide(index, "mensaje_whatsapp", event.target.value)}
                            />
                        </label>

                        <label>
                            Contacto de WhatsApp
                            <select
                                value={slide.contacto_whatsapp || "cmb_general"}
                                onChange={(event) => actualizarSlide(index, "contacto_whatsapp", event.target.value)}
                            >
                                {config.contactos_whatsapp.map((contacto) => (
                                    <option value={contacto.id} key={contacto.id}>
                                        {contacto.nombre}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Etiqueta
                            <input
                                value={slide.etiqueta}
                                onChange={(event) => actualizarSlide(index, "etiqueta", event.target.value)}
                            />
                        </label>
                    </article>
                ))}
            </section>

            <section className="guardar-flotante">
                <button onClick={guardarCambios}>Guardar cambios</button>
                {estado && <span>{estado}</span>}
            </section>
        </main>
    );
}

export default AdminPanel;