import java.nio.charset.StandardCharsets;

import client.SonoClient;
import main.SonoWrapper;
import main.base.ConsoleColors;
import main.sono.Datum;
import main.sono.Scope;

class ThreadWrapper extends Thread {
	private final Decoder decoder;
	private final SonoWrapper wrapper;
	private final String directory;
	private final String filename;
	private final Object[] code;
	private final boolean drawTree;
	private final Scope override;
	private final Listener listener;

	public ThreadWrapper(final Decoder decoder, final SonoWrapper wrapper, final String directory,
			final String filename, final Object[] code, final boolean drawTree, final Scope override,
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
		if (code == null) {
			System.out.println("CODE NULL");
			return;
		}
		try {
			for (final Object o : code) {
				if (this.isInterrupted()) {
					return;
				}

				if (o == null || o.getClass() != BoxPair.class) {
					if (o == null)
						System.out.println("BOX PAIR NULL");
					else
						System.out.println("NOT BOX PAIR\t" + o.getClass() + "\t" + o.toString());
					continue;
				}

				final BoxPair b = (BoxPair) o;
				final Object[] overrides = { new StandardOutput(listener, b.getBoxID()),
						new StandardError(listener, b.getBoxID()), null };
				final Datum result = wrapper.run(directory, filename,
						java.net.URLDecoder.decode(b.getCode(), StandardCharsets.UTF_8), drawTree, override, overrides);
				decoder.sendDatum(result, b.getBoxID());
			}
		} catch (final Exception e) {
			e.printStackTrace();
		}
	}
}

public class Decoder {
	private Thread current;
	private final Listener listener;

	private Scope mainScope;
	private SonoWrapper wrapper;

	public Decoder(final Listener listener) throws InterruptedException {
		this.listener = listener;
		newScope();
	}

	public void run(final Object[] code) {
		if (current != null)
			current.interrupt();
		current = new ThreadWrapper(this, wrapper, null, null, code, false, new Scope(null, mainScope, false),
				listener);
		current.start();
	}

	public void newScope() throws InterruptedException {
		this.mainScope = new Scope(null, null, false);
		SonoClient.setPath();
		SonoClient.loadData();
		this.wrapper = SonoClient.startClient(null, false, false, null, null, null, this.mainScope);
	}

	public Datum loadLibrary(final String library, final Object[] overrides) {
		final String newCode = java.net.URLDecoder.decode(library, StandardCharsets.UTF_8);
		return wrapper.run(".", null, "load \"" + newCode + "\";", false, mainScope, overrides);
	}

	public void sendDatum(final Datum datum, final int boxID) {
		listener.sendData("DATUM", null, boxID, datum);
	}
}