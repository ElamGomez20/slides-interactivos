import { useEffect, useState } from "react";
import "./App.css";
import AdminPanel from "./components/AdminPanel";
import { supabase } from "./lib/supabaseClient";

const extensionesPermitidas = [".jpg", ".png", ".mp4"];
const extensionesLogoPermitidas = [".jpg", ".png"];

const contactosDefault = [
    { id: "cmb_general", nombre: "CMB GENERAL", numero: "573185384697" },
    { id: "escuela_biblica", nombre: "Escuela Biblica", numero: "573176784539" },
    { id: "obra_social", nombre: "Obra Social", numero: "573113252349" },
    { id: "jovenes", nombre: "Jovenes", numero: "573237049379" },
];

const esUrlPermitida = (url, extensiones) => {
    if (!url) return false;

    const archivo = url.toLowerCase().split("?")[0];

    if (archivo.startsWith("http")) {
        return extensiones.some((extension) => archivo.includes(extension));
    }

    return extensiones.some((extension) => archivo.endsWith(extension));
};

const obtenerContactoWhatsApp = (slide, contactos) => {
    const contactoEncontrado = contactos.find((contacto) => {
        return contacto.id === slide.contacto_whatsapp;
    });

    if (contactoEncontrado && contactoEncontrado.numero) {
        return contactoEncontrado.numero;
    }

    if (contactos.length > 0 && contactos[0].numero) {
        return contactos[0].numero;
    }

    return "573185384697";
};

function App() {
    if (window.location.pathname.startsWith("/admin")) {
        return <AdminPanel />;
    }

    return <PaginaPrincipal />;
}

function PaginaPrincipal() {
    const [config, setConfig] = useState({
        titulo_sitio: "CMB EL CERRITO",
        logo_url: "",
    });

    const [contactos, setContactos] = useState(contactosDefault);
    const [slides, setSlides] = useState([]);
    const [slideActual, setSlideActual] = useState(0);
    const [detalleAbierto, setDetalleAbierto] = useState(false);
    const [direccion, setDireccion] = useState("derecha");
    const [touchInicio, setTouchInicio] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState("");

    const cargarContenido = async () => {
        try {
            setError("");

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
                .eq("activo", true)
                .order("orden", { ascending: true });

            if (contactosError) {
                throw contactosError;
            }

            const { data: slidesData, error: slidesError } = await supabase
                .from("slides")
                .select("*")
                .eq("activo", true)
                .order("orden", { ascending: true });

            if (slidesError) {
                throw slidesError;
            }

            const slidesFiltrados = (slidesData || []).filter((slide) => {
                return esUrlPermitida(slide.url_recurso, extensionesPermitidas);
            });

            setConfig(configData || {
                titulo_sitio: "CMB EL CERRITO",
                logo_url: "",
            });

            setContactos(contactosData && contactosData.length > 0 ? contactosData : contactosDefault);
            setSlides(slidesFiltrados);
            setSlideActual(0);
        } catch (errorActual) {
            setError(errorActual.message || "No se pudo cargar el contenido");
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        cargarContenido();

        const canal = supabase
            .channel("contenido-publico")
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "slides" },
                () => cargarContenido()
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "configuracion" },
                () => cargarContenido()
            )
            .on(
                "postgres_changes",
                { event: "*", schema: "public", table: "contactos_whatsapp" },
                () => cargarContenido()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(canal);
        };
    }, []);

    useEffect(() => {
        if (detalleAbierto) return;
        if (slides.length === 0) return;

        const intervalo = setInterval(() => {
            setDireccion("derecha");

            setSlideActual((actual) => {
                if (actual === slides.length - 1) {
                    return 0;
                }

                return actual + 1;
            });
        }, 15000);

        return () => clearInterval(intervalo);
    }, [detalleAbierto, slides.length]);

    const tituloSitio = config.titulo_sitio || "CMB EL CERRITO";
    const logoSitio = esUrlPermitida(config.logo_url, extensionesLogoPermitidas)
        ? config.logo_url
        : "";

    const cambiarSlide = (nuevoIndice, nuevaDireccion) => {
        setDireccion(nuevaDireccion);
        setSlideActual(nuevoIndice);
    };

    const irAlSiguiente = () => {
        if (slides.length === 0) return;

        if (slideActual === slides.length - 1) {
            cambiarSlide(0, "derecha");
        } else {
            cambiarSlide(slideActual + 1, "derecha");
        }
    };

    const irAlAnterior = () => {
        if (slides.length === 0) return;

        if (slideActual === 0) {
            cambiarSlide(slides.length - 1, "izquierda");
        } else {
            cambiarSlide(slideActual - 1, "izquierda");
        }
    };

    const iniciarTouch = (event) => {
        setTouchInicio(event.touches[0].clientX);
    };

    const terminarTouch = (event) => {
        if (touchInicio === null) return;

        const touchFinal = event.changedTouches[0].clientX;
        const diferencia = touchInicio - touchFinal;

        if (diferencia > 50) {
            irAlSiguiente();
        }

        if (diferencia < -50) {
            irAlAnterior();
        }

        setTouchInicio(null);
    };

    if (cargando) {
        return (
            <main className="app">
                <section className="telefono">
                    <div className="barra-superior">
                        <div className="marca">
                            {logoSitio && <img src={logoSitio} alt="Logo" />}
                            <span>{tituloSitio}</span>
                        </div>
                        <span>Cargando</span>
                    </div>

                    <div className="zona-slide">
                        <div className="contenido-slide">
                            <span className="etiqueta">Un momento</span>
                            <h1>Cargando contenido</h1>
                            <p>Estamos preparando la informacion.</p>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    if (error) {
        return (
            <main className="app">
                <section className="telefono">
                    <div className="barra-superior">
                        <div className="marca">
                            {logoSitio && <img src={logoSitio} alt="Logo" />}
                            <span>{tituloSitio}</span>
                        </div>
                        <span>Error</span>
                    </div>

                    <div className="zona-slide">
                        <div className="contenido-slide">
                            <span className="etiqueta">Aviso</span>
                            <h1>No se pudo cargar</h1>
                            <p>{error}</p>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    if (slides.length === 0) {
        return (
            <main className="app">
                <section className="telefono">
                    <div className="barra-superior">
                        <div className="marca">
                            {logoSitio && <img src={logoSitio} alt="Logo" />}
                            <span>{tituloSitio}</span>
                        </div>
                        <span>Sin contenido</span>
                    </div>

                    <div className="zona-slide">
                        <div className="contenido-slide">
                            <span className="etiqueta">Aviso</span>
                            <h1>No hay slides disponibles</h1>
                            <p>
                                Entra al panel administrador y agrega una diapositiva activa con
                                imagen .jpg, .png o video .mp4.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    const slide = slides[slideActual];

    const abrirWhatsApp = () => {
        const telefonoDestino = obtenerContactoWhatsApp(slide, contactos);
        const mensaje = encodeURIComponent(slide.mensaje_whatsapp || "Hola, quiero mas informacion.");
        const url = `https://wa.me/${telefonoDestino}?text=${mensaje}`;

        window.open(url, "_blank");
    };

    const renderRecurso = (clase) => {
        const archivo = slide.url_recurso.toLowerCase().split("?")[0];

        if (slide.tipo === "video" && archivo.includes(".mp4")) {
            return (
                <video
                    className={clase}
                    src={slide.url_recurso}
                    autoPlay
                    muted
                    loop
                    playsInline
                />
            );
        }

        if (
            slide.tipo === "imagen" &&
            (archivo.includes(".jpg") || archivo.includes(".png"))
        ) {
            return <img className={clase} src={slide.url_recurso} alt={slide.titulo} />;
        }

        return <div className={clase}>Archivo no permitido</div>;
    };

    if (detalleAbierto) {
        return (
            <main className="app">
                <section className="detalle">
                    <button className="btn-volver" onClick={() => setDetalleAbierto(false)}>
                        Volver
                    </button>

                    <div className="detalle-card">
                        <div className="marca marca-detalle">
                            {logoSitio && <img src={logoSitio} alt="Logo" />}
                            <span>{tituloSitio}</span>
                        </div>

                        <span className="etiqueta">{slide.etiqueta}</span>

                        <div className="detalle-media">{renderRecurso("media-detalle")}</div>

                        <h1>{slide.titulo}</h1>
                        <h2>{slide.subtitulo}</h2>
                        <p>{slide.descripcion}</p>

                        <button className="btn-whatsapp" onClick={abrirWhatsApp}>
                            Contactar por WhatsApp
                        </button>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="app">
            <section className="telefono">
                <div className="barra-superior">
                    <div className="marca">
                        {logoSitio && <img src={logoSitio} alt="Logo" />}
                        <span>{tituloSitio}</span>
                    </div>

                    <span>
                        {slideActual + 1}/{slides.length}
                    </span>
                </div>

                <button
                    key={slide.id}
                    className={`zona-slide animacion-${direccion}`}
                    onClick={() => setDetalleAbierto(true)}
                    onTouchStart={iniciarTouch}
                    onTouchEnd={terminarTouch}
                >
                    <div className="slide-media">{renderRecurso("media-slide")}</div>

                    <div className="contenido-slide">
                        <span className="etiqueta">{slide.etiqueta}</span>
                        <h1>{slide.titulo}</h1>
                        <p>{slide.subtitulo}</p>
                    </div>
                </button>

                <div className="controles">
                    <button onClick={irAlAnterior}>Anterior</button>
                    <button onClick={() => setDetalleAbierto(true)}>Ver mas</button>
                    <button onClick={irAlSiguiente}>Siguiente</button>
                </div>

                <div className="puntos">
                    {slides.map((item, index) => (
                        <button
                            key={item.id}
                            className={index === slideActual ? "punto activo" : "punto"}
                            onClick={() => {
                                const nuevaDireccion = index > slideActual ? "derecha" : "izquierda";
                                cambiarSlide(index, nuevaDireccion);
                            }}
                        />
                    ))}
                </div>
            </section>
        </main>
    );
}

export default App;