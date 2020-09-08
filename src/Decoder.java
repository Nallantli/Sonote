import java.nio.charset.StandardCharsets;

import client.SonoClient;
import main.SonoWrapper;
import main.sono.Datum;
import main.sono.Scope;

class ThreadWrapper extends Thread {
	private final Decoder decoder;
	private final SonoWrapper wrapper;
	private final String directory;
	private final String filename;
	private final BoxPair[] code;
	private final boolean drawTree;
	private final Scope override;
	private final Listener listener;

	public ThreadWrapper(final Decoder decoder, final SonoWrapper wrapper, final String directory,
			final String filename, final BoxPair[] code, final boolean drawTree, final Scope override,
			final Listener listener) {
		this.decoder = decoder;
		this.wrapper = wrapper;
		this.directory = directory;
		this.filename = filename;
		this.code = code;
		this.drawTree = drawTree;
		this.override = override;
		this.listener = listener;
	}

	@Override
	public void run() {
		try {
			for (final BoxPair b : code) {
				if (this.isInterrupted()) {
					decoder.sendDatum(null, 0);
					return;
				}
				if (b == null) {
					decoder.sendDatum(null, 0);
					return;
				}
				final Object[] overrides = { new StandardOutput(listener, b.getID()),
						new StandardError(listener, b.getID()), null };
				final Datum result = wrapper.run(directory, filename,
						java.net.URLDecoder.decode(b.getCode(), StandardCharsets.UTF_8), drawTree, override, overrides);
				decoder.sendDatum(result, b.getID());
			}
		} catch (final Exception e) {
			e.printStackTrace();
			decoder.sendDatum(null, 0);
		}
	}
}

public class Decoder {
	private Thread current;
	private final Listener listener;

	private final Scope mainScope;
	private final SonoWrapper wrapper;

	public Decoder(final Listener listener) throws InterruptedException {
		this.listener = listener;
		this.mainScope = new Scope(null, null, false);
		SonoClient.setPath();
		SonoClient.loadData();
		this.wrapper = SonoClient.startClient(null, false, false, null, null, null, this.mainScope);
	}

	public void run(final BoxPair[] code) {
		if (current != null)
			current.interrupt();
		current = new ThreadWrapper(this, wrapper, null, null, code, false, new Scope(null, mainScope, false),
				listener);
		current.start();
	}

	public Datum loadLibrary(final String library, final Object[] overrides) {
		final String newCode = java.net.URLDecoder.decode(library, StandardCharsets.UTF_8);
		return wrapper.run(".", null, "load \"" + newCode + "\";", false, mainScope, overrides);
	}

	public void sendDatum(final Datum datum, final int id) {
		listener.sendData("DATUM", null, id, datum);
	}
}