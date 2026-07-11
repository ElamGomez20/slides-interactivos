import { useEffect, useState } from "react";
import "./App.css";
import slidesData from "./data/slides.json";
import configData from "./data/config.json";
import AdminPanel from "./components/AdminPanel";

const extensionesPermitidas = [".jpg", ".png", ".mp4"];
const extensionesLogoPermitidas = [".jpg", ".png"];

const esRecursoPermitido = (url) => {
    if (!url) return false;

    const archivo = url.toLowerCase().split("?")[0];

    return extensionesPermitidas.some((extension) => archivo.endsWith(extension));
};

const esLogoPermitido = (url) => {
    if (!url) return false;

    const archivo = url.toLowerCase().split("?")[0];

    return extensionesLogoPermitidas.some((extension) => archivo.endsWith(extension));
};

const obtenerContactoWhatsApp = (slide) => {
    const contactos = configData.contactos_whatsapp || [];

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

const slides = slidesData.slides.filter((slide) => {
    const estaActivo = slide.activo !== false;

    return estaActivo && esRecursoPermitido(slide.url_recurso);
});

function App() {
    if (window.location.pathname.startsWith("/admin")) {
        return <AdminPanel />;
    }

    return <PaginaPrincipal />;
}

function PaginaPrincipal() {
    const [slideActual, setSlideActual] = useState(0);
    const [detalleAbierto, setDetalleAbierto] = useState(false);
    const [direccion, setDireccion] = useState("derecha");
    const [touchInicio, setTouchInicio] = useState(null);

    const tituloSitio = configData.titulo_sitio || "CMB EL CERRITO";
    const logoSitio = esLogoPermitido(configData.logo) ? configData.logo : "";

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
    }, [detalleAbierto]);

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
                                Revisa que los slides esten activos y que los archivos sean .jpg,
                                .png o .mp4.
                            </p>
                        </div>
                    </div>
                </section>
            </main>
        );
    }

    const slide = slides[slideActual];

    const abrirWhatsApp = () => {
        const telefonoDestino = obtenerContactoWhatsApp(slide);
        const mensaje = encodeURIComponent(slide.mensaje_whatsapp);
        const url = `https://wa.me/${telefonoDestino}?text=${mensaje}`;

        window.open(url, "_blank");
    };

    const renderRecurso = (clase) => {
        const archivo = slide.url_recurso.toLowerCase();

        if (slide.tipo === "video" && archivo.endsWith(".mp4")) {
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
            (archivo.endsWith(".jpg") || archivo.endsWith(".png"))
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