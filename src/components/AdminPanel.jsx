import { useEffect, useState } from "react";
import "./AdminPanel.css";
import { supabase } from "../lib/supabaseClient";

const contactosDefault = [
    { id: "cmb_general", nombre: "CMB GENERAL", numero: "573185384697", orden: 1, activo: true },
    { id: "escuela_biblica", nombre: "Escuela Biblica", numero: "573176784539", orden: 2, activo: true },
    { id: "obra_social", nombre: "Obra Social", numero: "573113252349", orden: 3, activo: true },
    { id: "jovenes", nombre: "Jovenes", numero: "573237049379", orden: 4, activo: true },
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

const obtenerTipoArchivo = (nombre) => {
    return nombre.toLowerCase().endsWith(".mp4") ? "video" : "imagen";
};

function AdminPanel() {
    const [email, setEmail] = useState(sessionStorage.getItem("admin_email") || "");
    const [password, setPassword] = useState("");
    const [autenticado, setAutenticado] = useState(false);
    const [config, setConfig] = useState(null);
    const [contactos, setContactos] = useState(contactosDefault);
    const [slides, setSlides] = useState([]);
    const [estado, setEstado] = useState("");
    const [subiendoArchivo, setSubiendoArchivo] = useState(false);
    const [guardando, setGuardando] = useState(false);

    useEffect(() => {
        verificarSesion();
    }, []);

    const verificarSesion = async () => {
        const { data } = await supabase.auth.getSession();

        if (data.session) {
            setAutenticado(true);
            cargarContenido();
        }
    };

    const iniciarSesion = async () => {
        try {
            setEstado("Iniciando sesion...");

            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                setEstado(error.message);
                return;
            }

            sessionStorage.setItem("admin_email", email);
            setAutenticado(true);
            setPassword("");
            await cargarContenido();
        } catch (errorActual) {
            setEstado(errorActual.message || "No se pudo iniciar sesion");
        }
    };

    const cerrarSesion = async () => {
        await supabase.auth.signOut();
        setAutenticado(false);
        setConfig(null);
        setContactos(contactosDefault);
        setSlides([]);
        setEstado("");
    };

    const cargarContenido = async () => {
        try {
            setEstado("Cargando contenido...");

            const { data: configData, error: configError } = await supabase
                .from("configuracion")
                .select("*")
                .eq("id", 1)
                .single();

            if (configError) {
                throw configError;
            }

            const { data: contactosData, error: contactosError } = await supabase
                .from("contactos_whatsapp")
                .select("*")
                .order("orden", { ascending: true });

            if (contactosError) {
                throw contactosError;
            }

            const { data: slidesData, error: slidesError } = await supabase
                .from("slides")
                .select("*")
                .order("orden", { ascending: true });

            if (slidesError) {
                throw slidesError;
            }

            setConfig(configData || {
                id: 1,
                titulo_sitio: "CMB EL CERRITO",
                logo_url: "",
            });

            setContactos(contactosData && contactosData.length > 0 ? contactosData : contactosDefault);
            setSlides(slidesData || []);
            setEstado("Contenido cargado");
        } catch (errorActual) {
            setEstado(errorActual.message || "No se pudo cargar contenido");
        }
    };

    const actualizarConfig = (campo, valor) => {
        setConfig({
            ...config,
            [campo]: valor,
        });
    };

    const actualizarContacto = (index, campo, valor) => {
        const nuevosContactos = [...contactos];

        nuevosContactos[index] = {
            ...nuevosContactos[index],
            [campo]: valor,
        };

        setContactos(nuevosContactos);
    };

    const actualizarSlide = (index, campo, valor) => {
        const nuevosSlides = [...slides];

        nuevosSlides[index] = {
            ...nuevosSlides[index],
            [campo]: valor,
        };

        setSlides(nuevosSlides);
    };

    const subirArchivo = async (file) => {
        if (!file) return null;

        const nombreLimpio = limpiarNombreArchivo(file.name);

        if (!extensionValida(nombreLimpio)) {
            alert("Solo se permiten archivos .jpg, .png o .mp4");
            return null;
        }

        setSubiendoArchivo(true);
        setEstado("Subiendo archivo a Supabase...");

        const ruta = `uploads/${Date.now()}-${nombreLimpio}`;

        const { error } = await supabase.storage
            .from("multimedia")
            .upload(ruta, file, {
                cacheControl: "3600",
                upsert: false,
            });

        if (error) {
            setSubiendoArchivo(false);
            setEstado(error.message);
            return null;
        }

        const { data } = supabase.storage
            .from("multimedia")
            .getPublicUrl(ruta);

        setSubiendoArchivo(false);
        setEstado("Archivo subido correctamente");

        return {
            url: data.publicUrl,
            tipo: obtenerTipoArchivo(nombreLimpio),
        };
    };

    const cambiarLogo = async (file) => {
        if (!file) return;

        const nombreLimpio = limpiarNombreArchivo(file.name);

        if (!nombreLimpio.endsWith(".jpg") && !nombreLimpio.endsWith(".png")) {
            alert("El logo solo puede ser .jpg o .png");
            return;
        }

        const archivoSubido = await subirArchivo(file);

        if (!archivoSubido) return;

        actualizarConfig("logo_url", archivoSubido.url);
    };

    const cambiarArchivoSlide = async (index, file) => {
        if (!file) return;

        const archivoSubido = await subirArchivo(file);

        if (!archivoSubido) return;

        actualizarSlide(index, "url_recurso", archivoSubido.url);
        actualizarSlide(index, "tipo", archivoSubido.tipo);
    };

    const agregarSlide = () => {
        const siguienteOrden = slides.length > 0
            ? Math.max(...slides.map((slide) => Number(slide.orden || 0))) + 1
            : 1;

        const nuevoSlide = {
            id: null,
            activo: true,
            tipo: "imagen",
            url_recurso: "",
            titulo: "Nuevo slide",
            subtitulo: "Subtitulo del slide",
            descripcion: "Descripcion del contenido.",
            mensaje_whatsapp: "Hola, quiero recibir mas informacion.",
            contacto_whatsapp: "cmb_general",
            etiqueta: "Nuevo",
            orden: siguienteOrden,
        };

        setSlides([...slides, nuevoSlide]);
    };

    const eliminarSlide = async (index) => {
        const slide = slides[index];
        const confirmar = window.confirm("Seguro que quieres eliminar este slide?");

        if (!confirmar) return;

        if (slide.id) {
            const { error } = await supabase
                .from("slides")
                .delete()
                .eq("id", slide.id);

            if (error) {
                setEstado(error.message);
                return;
            }
        }

        const nuevosSlides = slides.filter((_, i) => i !== index);
        setSlides(nuevosSlides);
        setEstado("Slide eliminado");
    };

    const guardarCambios = async () => {
        try {
            if (subiendoArchivo) {
                setEstado("Espera a que termine de subir el archivo");
                return;
            }

            setGuardando(true);
            setEstado("Guardando cambios...");

            const { error: configError } = await supabase
                .from("configuracion")
                .upsert({
                    id: 1,
                    titulo_sitio: config.titulo_sitio || "CMB EL CERRITO",
                    logo_url: config.logo_url || "",
                    updated_at: new Date().toISOString(),
                });

            if (configError) {
                throw configError;
            }

            const contactosParaGuardar = contactos.map((contacto, index) => ({
                id: contacto.id,
                nombre: contacto.nombre,
                numero: contacto.numero,
                orden: index + 1,
                activo: contacto.activo !== false,
                updated_at: new Date().toISOString(),
            }));

            const { error: contactosError } = await supabase
                .from("contactos_whatsapp")
                .upsert(contactosParaGuardar);

            if (contactosError) {
                throw contactosError;
            }

            for (let i = 0; i < slides.length; i++) {
                const slide = slides[i];

                const slideParaGuardar = {
                    activo: slide.activo !== false,
                    tipo: slide.tipo || "imagen",
                    url_recurso: slide.url_recurso || "",
                    titulo: slide.titulo || "Sin titulo",
                    subtitulo: slide.subtitulo || "",
                    descripcion: slide.descripcion || "",
                    mensaje_whatsapp: slide.mensaje_whatsapp || "",
                    contacto_whatsapp: slide.contacto_whatsapp || "cmb_general",
                    etiqueta: slide.etiqueta || "",
                    orden: Number(slide.orden || i + 1),
                    updated_at: new Date().toISOString(),
                };

                if (slide.id) {
                    const { error } = await supabase
                        .from("slides")
                        .update(slideParaGuardar)
                        .eq("id", slide.id);

                    if (error) {
                        throw error;
                    }
                } else {
                    const { error } = await supabase
                        .from("slides")
                        .insert(slideParaGuardar);

                    if (error) {
                        throw error;
                    }
                }
            }

            await cargarContenido();
            setEstado("Cambios guardados correctamente. La pagina ya puede mostrar la informacion actualizada.");
        } catch (errorActual) {
            setEstado(errorActual.message || "No se pudo guardar");
        } finally {
            setGuardando(false);
        }
    };

    if (!autenticado) {
        return (
            <main className="admin-page">
                <section className="admin-login">
                    <h1>Panel Administrador</h1>
                    <p>Ingresa con el usuario creado en Supabase Authentication.</p>

                    <input
                        type="email"
                        placeholder="Correo del administrador"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                    />

                    <input
                        type="password"
                        placeholder="Contrasena del administrador"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                    />

                    <button onClick={iniciarSesion}>Entrar</button>

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
                    <p>Edita informacion, contactos, imagenes y videos desde Supabase.</p>
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
                        value={config?.titulo_sitio || ""}
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

                {config?.logo_url && <p className="ruta-archivo">Logo actual: {config.logo_url}</p>}
            </section>

            <section className="admin-card">
                <h2>Contactos de WhatsApp</h2>

                {contactos.map((contacto, index) => (
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

                {slides.map((slide, index) => (
                    <article className="slide-editor" key={slide.id || `nuevo-${index}`}>
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

                        <p className="ruta-archivo">Archivo actual: {slide.url_recurso || "Sin archivo"}</p>

                        <label>
                            Orden
                            <input
                                type="number"
                                value={slide.orden || index + 1}
                                onChange={(event) => actualizarSlide(index, "orden", Number(event.target.value))}
                            />
                        </label>

                        <label>
                            Titulo
                            <input
                                value={slide.titulo || ""}
                                onChange={(event) => actualizarSlide(index, "titulo", event.target.value)}
                            />
                        </label>

                        <label>
                            Subtitulo
                            <input
                                value={slide.subtitulo || ""}
                                onChange={(event) => actualizarSlide(index, "subtitulo", event.target.value)}
                            />
                        </label>

                        <label>
                            Descripcion
                            <textarea
                                value={slide.descripcion || ""}
                                onChange={(event) => actualizarSlide(index, "descripcion", event.target.value)}
                            />
                        </label>

                        <label>
                            Mensaje de WhatsApp
                            <textarea
                                value={slide.mensaje_whatsapp || ""}
                                onChange={(event) => actualizarSlide(index, "mensaje_whatsapp", event.target.value)}
                            />
                        </label>

                        <label>
                            Contacto de WhatsApp
                            <select
                                value={slide.contacto_whatsapp || "cmb_general"}
                                onChange={(event) => actualizarSlide(index, "contacto_whatsapp", event.target.value)}
                            >
                                {contactos.map((contacto) => (
                                    <option value={contacto.id} key={contacto.id}>
                                        {contacto.nombre}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Etiqueta
                            <input
                                value={slide.etiqueta || ""}
                                onChange={(event) => actualizarSlide(index, "etiqueta", event.target.value)}
                            />
                        </label>
                    </article>
                ))}
            </section>

            <section className="guardar-flotante">
                <button onClick={guardarCambios} disabled={subiendoArchivo || guardando}>
                    {subiendoArchivo ? "Subiendo archivo..." : guardando ? "Guardando..." : "Guardar cambios"}
                </button>

                {estado && <span>{estado}</span>}
            </section>
        </main>
    );
}

export default AdminPanel;